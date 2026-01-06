
# 🚀 byKB — Backend Keep-Alive System (Free-Tier Aware)

byKB is a developer-focused automation system designed to **reduce cold starts** for free-tier backend deployments (such as Render, Vercel, and Cyclic) by periodically pinging a lightweight health endpoint.

> ⚠️ This project is intentionally honest about real-world infrastructure limits.  
> byKB demonstrates a production-ready architecture operating under free-tier constraints.

---

## 📌 Problem Statement

Many free-tier backend platforms automatically **sleep services after inactivity** (≈15 minutes).

This leads to:
- Cold starts
- Slow first responses
- Poor demo and prototype experience

byKB was built to **minimize** these cold starts by simulating regular activity through safe health checks.

---

## 🧠 Core Idea

If a backend receives **any inbound request**, it wakes up globally for all users.

byKB works by:
1. Collecting backend URLs from users
2. Normalizing them to a lightweight `/_health` endpoint
3. Periodically pinging those endpoints
4. Keeping services warm as long as the scheduler runs

---

## 🏗️ Architecture Overview

### Frontend
- React + Vite
- Custom CSS (no UI frameworks)
- Mobile-first (Android, iOS, Desktop)
- Dashboard showing:
  - Registered URLs
  - Last ping time
  - Status (Awake / Sleeping / Error)
- Deployed on Vercel

### Backend / API
- Vercel Serverless Functions
- Google Sign-In authentication
- No database
- GitHub Issues used as the datastore

### Scheduler / Automation
- GitHub Actions (cron-based)
- Runs every 5–15 minutes
- Pings only the `/_health` endpoint
- Includes retry logic, jitter, and backoff handling

---

## 🔒 URL & Security Rules

- Allowed domains only:
  - `*.onrender.com`
  - `*.vercel.app`
  - `*.cyclic.app`

- User may submit:
```

[https://your-app.onrender.com](https://your-app.onrender.com)

```
or
```

[https://your-app.onrender.com/_health](https://your-app.onrender.com/_health)

```

- Internally, byKB always stores and pings:
```

[https://your-app.onrender.com/_health](https://your-app.onrender.com/_health)

````

- Health endpoint must:
- Be public
- Return HTTP 200
- Avoid DB calls
- Avoid authentication
- Be extremely lightweight

---

## 🧪 Health Endpoint Examples

### Flask (Python)
```python
@app.route("/_health")
def health():
  return {"status": "ok"}, 200
````

### Express (Node.js)

```js
app.get("/_health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
```

---

## ⚙️ GitHub Actions Logic (Summary)

* Scheduled cron execution
* Random jitter to avoid synchronized load
* Retries on temporary failures
* Cold starts treated as expected behavior
* After 3 consecutive failures:

  * Endpoint marked as failed
  * 1-hour backoff applied
  * Status logged via GitHub Issue comments

---

## 🚨 Limitations (Important & Honest)

**byKB cannot guarantee 24/7 uptime using only free infrastructure.**

Reason:

* GitHub Actions cron jobs are **best-effort**, not guaranteed
* Scheduled runs may be delayed or skipped
* A single skipped run allows the backend to sleep again
* This is an infrastructure limitation, not a code or design flaw

What this means:

* ❌ Guaranteed always-awake backends → Not possible for free
* ✅ Cold starts significantly reduced → Achieved
* ✅ Architecture ready for always-on infrastructure → Yes

With a dedicated always-on worker (paid infra), byKB would function exactly as intended.

---

## 🎯 Why This Project Still Matters

This project demonstrates:

* Real-world system design
* Automation under constraints
* Honest trade-off analysis
* Production-grade architecture
* Infrastructure-aware engineering

> Engineering is not just about building systems —
> it’s about understanding their limits.

---

## 🤝 Contributions Welcome

If you:

* Have ideas to improve reliability under free constraints
* Know alternative scheduling strategies
* Want to extend this into a paid or hybrid model

Contributions and discussions are welcome.

---

## 📎 Links

* 🌐 Live Demo: *https://by-kb-app.vercel.app/*
* 📂 GitHub Repository: *(this repository)*

---

## 📜 License

MIT License — free to use, modify, and learn from.

---

### ⭐ Final Note

byKB does not hide limitations.

It documents them — because real engineering is honest engineering.

