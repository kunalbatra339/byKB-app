import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { Trash2, Copy, Plus, Activity, Server } from 'lucide-react';

const API_BASE = '/api';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [status, setStatus] = useState('unknown'); // 'alive' | 'failed' | 'unknown'
  const [generatorLang, setGeneratorLang] = useState('python');

  // GOOGLE LOGIN
  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setToken(codeResponse.access_token);
      fetchUserInfo(codeResponse.access_token);
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  const fetchUserInfo = async (accessToken) => {
    // 1. Get Google User Profile
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });
    const data = await res.json();
    setUser(data);
    fetchUserUrls(accessToken);
  };

  // FETCH URLS FROM API
  const fetchUserUrls = async (accessToken) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/get-urls`, {
        headers: { 'Authorization': accessToken }
      });
      const data = await res.json();
      if (res.ok) {
        setUrls(data.urls || []);
        setStatus(data.status || 'unknown');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // ADD URL
  const handleAddUrl = async () => {
    if (!urlInput) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/add-url`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      const data = await res.json();
      if (res.ok) {
        setUrls(data.urls);
        setUrlInput('');
      } else {
        alert(data.error || 'Error adding URL');
      }
    } catch (e) {
      alert('Network error');
    }
    setLoading(false);
  };

  // REMOVE URL
  const handleRemoveUrl = async (urlToRemove) => {
    if(!confirm("Stop keeping this backend awake?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/remove-url`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToRemove })
      });
      const data = await res.json();
      if (res.ok) setUrls(data.urls);
    } catch (e) {
      alert('Error removing URL');
    }
    setLoading(false);
  };

  // COPY CODE
  const copyCode = (text) => {
    navigator.clipboard.writeText(text);
    alert("Code copied to clipboard!");
  };

  if (!user) {
    return (
      <div className="container" style={{textAlign: 'center', marginTop: '100px'}}>
        <h1 style={{color: 'var(--primary)'}}>byKB</h1>
        <p>Keep your free Render/Vercel backends awake forever.</p>
        <button className="btn btn-primary" onClick={() => login()}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <h1 style={{fontSize: '1.5rem'}}>byKB</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <img src={user.picture} style={{width: 32, borderRadius: '50%'}} alt="user"/>
        </div>
      </header>

      {/* DASHBOARD */}
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
          <h2>Your Backends</h2>
          {urls.length > 0 && (
            <span className={`badge ${status === 'failed' ? 'badge-failed' : 'badge-alive'}`}>
              {status === 'failed' ? 'Some Failing' : 'System Active'}
            </span>
          )}
        </div>

        {urls.length === 0 ? (
          <p>No backends added yet.</p>
        ) : (
          urls.map((u, idx) => (
            <div key={idx} style={{
              padding: '12px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '8px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%'}}>
                <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>MONITORED</div>
                <div style={{fontWeight: 500}}>{u}</div>
              </div>
              <button onClick={() => handleRemoveUrl(u)} style={{border:'none', background:'transparent', color:'var(--error)', cursor:'pointer'}}>
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}

        {urls.length < 3 && (
          <div style={{marginTop: '20px'}}>
            <div className="input-group">
              <input 
                className="input-field" 
                placeholder="https://myapp.onrender.com" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleAddUrl} disabled={loading}>
              {loading ? 'Processing...' : <><Plus size={18} style={{marginRight:8}}/> Add Backend</>}
            </button>
            <p style={{fontSize: '0.8rem', marginTop: '8px'}}>Supported: onrender.com, vercel.app, cyclic.app</p>
          </div>
        )}
      </div>

      {/* GENERATOR */}
      <div className="card" style={{background: 'var(--primary-light)'}}>
        <h2><Server size={18} style={{marginRight:8}}/> 1. Add Endpoint</h2>
        <p>You MUST add this code to your backend before adding the URL above.</p>
        
        <div style={{marginBottom: '10px'}}>
          <button style={{marginRight: 10, fontWeight: generatorLang==='python'?800:400}} onClick={()=>setGeneratorLang('python')}>Python (Flask)</button>
          <button style={{fontWeight: generatorLang==='node'?800:400}} onClick={()=>setGeneratorLang('node')}>Node (Express)</button>
        </div>

        <div className="code-block">
          {generatorLang === 'python' ? 
`@app.route("/_health")
def health():
    return {"status": "ok"}, 200` : 
`app.get("/_health", (req, res) => {
  res.status(200).json({status: "ok"});
});`}
          <button 
            style={{position: 'absolute', top: 5, right: 5, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: 5, borderRadius: 4, cursor: 'pointer'}}
            onClick={() => copyCode(generatorLang === 'python' ? `@app.route("/_health")\ndef health():\n    return {"status": "ok"}, 200` : `app.get("/_health", (req, res) => {\n  res.status(200).json({status: "ok"});\n});`)}
          >
            <Copy size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function Root() {
  return (
    <GoogleOAuthProvider clientId="753460169154-c9g5edi2pb0mcmef7oh68nt29fdt97i3.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  );
}

export default Root;