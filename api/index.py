from flask import Flask, request, jsonify
import os
import requests
import re
from github import Github
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

# CONFIG
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO_NAME = os.environ.get("GITHUB_REPO") # format: "username/repo"

# DOMAIN REGEX
ALLOWED_DOMAINS = r"^(https?:\/\/)?([\w-]+\.)+(onrender\.com|vercel\.app|cyclic\.app)(\/.*)?$"

def verify_google_token(token):
    try:
        # Simple validation via Google API endpoint
        url = f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={token}"
        res = requests.get(url)
        if res.status_code != 200:
            return None
        data = res.json()
        if "email" in data and data["email_verified"] == "true":
            return data["email"]
        return None
    except:
        return None

def normalize_url(url):
    url = url.strip()

    # Ensure protocol
    if not url.startswith("http"):
        url = "https://" + url

    # Remove trailing slash
    if url.endswith("/"):
        url = url[:-1]

    return url


def get_issue(user_email):
    g = Github(GITHUB_TOKEN)
    repo = g.get_repo(REPO_NAME)
    
    # Search for issue
    query = f"keepalive: {user_email} in:title repo:{REPO_NAME} state:open"
    issues = g.search_issues(query)
    
    for issue in issues:
        return issue
    return None

def parse_urls_from_body(body):
    import yaml
    try:
        # Simple parsing strategy: look for lines starting with - http
        lines = body.split('\n')
        urls = []
        for line in lines:
            line = line.strip()
            if line.startswith("- http"):
                urls.append(line.replace("- ", "").strip())
        return urls
    except:
        return []

@app.route('/api/get-urls', methods=['GET'])
def get_urls():
    token = request.headers.get('Authorization')
    email = verify_google_token(token)
    if not email:
        return jsonify({"error": "Unauthorized"}), 401

    issue = get_issue(email)
    if not issue:
        return jsonify({"urls": [], "status": "unknown"}), 200
        
    urls = parse_urls_from_body(issue.body)
    
    # Determine status from labels
    labels = [l.name for l in issue.labels]
    status = "alive" if "alive" in labels else "failed" if "failed" in labels else "unknown"
    
    return jsonify({"urls": urls, "status": status}), 200

@app.route('/api/add-url', methods=['POST'])
def add_url():
    token = request.headers.get('Authorization')
    email = verify_google_token(token)
    if not email:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    raw_url = data.get('url', '')
    
    # Validation
    if not re.match(ALLOWED_DOMAINS, raw_url):
        return jsonify({"error": "Domain not allowed. Use Render, Vercel, or Cyclic."}), 400
        
    final_url = normalize_url(raw_url)
    
    g = Github(GITHUB_TOKEN)
    repo = g.get_repo(REPO_NAME)
    issue = get_issue(email)
    
    if issue:
        current_urls = parse_urls_from_body(issue.body)
        if len(current_urls) >= 3:
            return jsonify({"error": "Limit reached (Max 3)."}), 400
        if final_url in current_urls:
            return jsonify({"error": "URL already exists."}), 400
            
        current_urls.append(final_url)
        
        # Reconstruct Body
        new_body = f"Submitted-by: {email}\nURLs:\n"
        for u in current_urls:
            new_body += f"- {u}\n"
        new_body += "\nAdded-via: byKB"
        
        issue.edit(body=new_body)
        return jsonify({"urls": current_urls}), 200
    else:
        # Create new issue
        body = f"Submitted-by: {email}\nURLs:\n- {final_url}\n\nAdded-via: byKB"
        repo.create_issue(title=f"keepalive: {email}", body=body, labels=["alive"])
        return jsonify({"urls": [final_url]}), 200

@app.route('/api/remove-url', methods=['POST'])
def remove_url():
    token = request.headers.get('Authorization')
    email = verify_google_token(token)
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
        
    target = request.json.get('url')
    
    g = Github(GITHUB_TOKEN)
    issue = get_issue(email)
    
    if not issue:
        return jsonify({"error": "No records found"}), 404
        
    current_urls = parse_urls_from_body(issue.body)
    if target in current_urls:
        current_urls.remove(target)
        
    new_body = f"Submitted-by: {email}\nURLs:\n"
    for u in current_urls:
        new_body += f"- {u}\n"
    new_body += "\nAdded-via: byKB"
    
    issue.edit(body=new_body)
    
    return jsonify({"urls": current_urls}), 200


if __name__ == '__main__':
    app.run(port=5328, debug=True)