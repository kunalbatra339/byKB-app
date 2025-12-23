import os
import requests
import time
import random
from github import Github

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO_NAME = os.environ.get("REPO_NAME")

def ping_url(url):
    try:
        # 8 second timeout, allow redirect
        response = requests.get(url, timeout=8, allow_redirects=True)
        # 200-399 is considered success for keepalive
        if 200 <= response.status_code < 400:
            return True, response.status_code
        return False, response.status_code
    except requests.exceptions.RequestException:
        return False, 0

def run():
    # 1. Jitter (0-30s) to prevent exact second spikes
    jitter = random.randint(0, 30)
    print(f"Waiting {jitter}s jitter...")
    time.sleep(jitter)

    g = Github(GITHUB_TOKEN)
    repo = g.get_repo(REPO_NAME)

    # 2. Get all open issues with title 'keepalive:'
    issues = repo.get_issues(state='open')
    
    for issue in issues:
        if not issue.title.startswith("keepalive:"):
            continue

        print(f"Processing {issue.title}...")
        
        # Parse URLs
        lines = issue.body.split('\n')
        urls = [line.replace("- ", "").strip() for line in lines if line.strip().startswith("- http")]
        
        if not urls:
            continue

        all_alive = True
        failed_urls = []

        for url in urls:
            success, status = ping_url(url)
            print(f"  -> Pinging {url} : {status}")
            
            if not success:
                # Retry once immediately if cold start suspected
                time.sleep(1)
                success_retry, status_retry = ping_url(url)
                if not success_retry:
                    all_alive = False
                    failed_urls.append(url)
                    print(f"     FAILED (Retry: {status_retry})")
                else:
                    print(f"     RECOVERED (Retry: {status_retry})")

            # Sleep between pings to be nice
            time.sleep(0.5)

        # 3. Update Labels
        current_labels = [l.name for l in issue.labels]
        
        if all_alive:
            if "failed" in current_labels:
                issue.remove_from_labels("failed")
            if "alive" not in current_labels:
                issue.add_to_labels("alive")
        else:
            if "alive" in current_labels:
                issue.remove_from_labels("alive")
            if "failed" not in current_labels:
                issue.add_to_labels("failed")
                
                # If newly failed, add comment (simplified logic to avoid spam)
                # In real prod, check last comment timestamp
                try:
                    # Only comment if no recent comments (naive check)
                    if issue.comments == 0:
                        issue.create_comment(f"**Alert:** The following URLs failed to respond: {', '.join(failed_urls)}")
                except:
                    pass

if __name__ == "__main__":
    run()