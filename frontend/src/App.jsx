import { useEffect, useState } from "react";
import Courtroom from "./Courtroom";

const API_URL = "http://localhost:4000";

function App() {
  const [tab, setTab] = useState("feed");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [trials, setTrials] = useState([]);
  const [trialDetails, setTrialDetails] = useState({});
  const [newPost, setNewPost] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [voteUser, setVoteUser] = useState("");

  // ---------- Loader ----------
  const loadUsers = () => {
    fetch(`${API_URL}/api/users`)
      .then((r) => r.json())
      .then((d) => d.ok && setUsers(d.users));
  };

  const loadPosts = () => {
    fetch(`${API_URL}/api/posts`)
      .then((r) => r.json())
      .then((d) => d.ok && setPosts(d.posts));
  };

  const loadTrials = async () => {
    const r = await fetch(`${API_URL}/api/trials`);
    const d = await r.json();
    if (d.ok) {
      setTrials(d.trials);
      const details = {};
      await Promise.all(
        d.trials.map(async (t) => {
          const [jr, rr] = await Promise.all([
            fetch(`${API_URL}/api/trials/${t.id}/judges`).then((x) => x.json()),
            fetch(`${API_URL}/api/trials/${t.id}/results`).then((x) => x.json()),
          ]);
          details[t.id] = {
            judges: jr.ok ? jr.judges : [],
            tally: rr.ok ? rr.tally : { guilty: 0, not_guilty: 0 },
          };
        })
      );
      setTrialDetails(details);
    }
  };

  useEffect(() => {
    loadUsers();
    loadPosts();
    loadTrials();
  }, []);

  // ---------- Actions ----------
  const handleCreatePost = async () => {
    if (!selectedUser || !newPost) return alert("Bitte User und Inhalt angeben!");
    const r = await fetch(`${API_URL}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: selectedUser, content: newPost }),
    });
    const d = await r.json();
    if (d.ok) {
      setNewPost("");
      loadPosts();
    } else {
      alert("Fehler: " + d.error);
    }
  };

  const handleLike = async (id) => {
    await fetch(`${API_URL}/api/posts/${id}/like`, { method: "POST" });
    loadPosts();
  };

  const handleAccuse = async (id) => {
    await fetch(`${API_URL}/api/posts/${id}/accuse`, { method: "POST" });
    loadPosts();
  };

  const handleCheckTrials = async () => {
    const r = await fetch(`${API_URL}/api/trials/check`, { method: "POST" });
    const d = await r.json();
    if (d.ok) {
      await loadTrials();
      alert(`Neue Trials erstellt: ${d.created}`);
    }
  };

  const handleVote = async (trialId, role, vote) => {
    if (!voteUser) {
      alert("Bitte zuerst einen User zum Voten auswählen!");
      return;
    }
    const r = await fetch(`${API_URL}/api/trials/${trialId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: voteUser, role, vote }),
    });
    const d = await r.json();
    if (!d.ok) {
      alert("Fehler: " + d.error);
      return;
    }
    const rr = await fetch(`${API_URL}/api/trials/${trialId}/results`);
    const rd = await rr.json();
    setTrialDetails((prev) => ({
      ...prev,
      [trialId]: {
        ...(prev[trialId] || { judges: [] }),
        tally: rd.ok ? rd.tally : { guilty: 0, not_guilty: 0 },
      },
    }));
  };

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", fontFamily: "Arial" }}>
      <h1>Verdica</h1>

      {/* Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setTab("feed")}>Feed</button>
        <button onClick={() => setTab("users")} style={{ marginLeft: 10 }}>
          Users
        </button>
        <button onClick={() => setTab("trials")} style={{ marginLeft: 10 }}>
          Trials
        </button>
        <button onClick={() => setTab("courtroom")} style={{ marginLeft: 10 }}>
          3D Courtroom
        </button>
        {tab === "trials" && (
          <button onClick={handleCheckTrials} style={{ marginLeft: 10 }}>
            Trials prüfen
          </button>
        )}
      </div>

      {/* FEED */}
      {tab === "feed" && (
        <div>
          <h2>Feed</h2>
          <div style={{ padding: 10, border: "1px solid #ccc", marginBottom: 20 }}>
            <h3>Neuen Post erstellen</h3>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">-- User wählen --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
            <br />
            <br />
            <textarea
              rows={3}
              cols={50}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Was willst du posten?"
            />
            <br />
            <br />
            <button onClick={handleCreatePost}>Post erstellen</button>
          </div>
          {posts.length === 0 ? (
            <p>Noch keine Posts vorhanden.</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} style={{ border: "1px solid #ddd", padding: 10, marginBottom: 10, borderRadius: 6 }}>
                <p>
                  <strong>{p.users?.username || "Unbekannt"}</strong> schrieb:
                </p>
                <p>{p.content}</p>
                <small>
                  Likes: {p.likes} | Accusations: {p.accusations} | {new Date(p.created_at).toLocaleString()}
                </small>
                <br />
                <button onClick={() => handleLike(p.id)}>👍 Like</button>
                <button onClick={() => handleAccuse(p.id)} style={{ marginLeft: 10, color: "red" }}>
                  ⚖️ Accuse
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div>
          <h2>Users</h2>
          {users.length === 0 ? (
            <p>Noch keine User vorhanden.</p>
          ) : (
            <ul>
              {users.map((u) => (
                <li key={u.id}>
                  {u.username} — Prestige: {u.prestige}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* TRIALS */}
      {tab === "trials" && (
        <div>
          <h2>Trials</h2>
          <div style={{ marginBottom: 20 }}>
            <label>
              Vote als:{" "}
              <select value={voteUser} onChange={(e) => setVoteUser(e.target.value)}>
                <option value="">-- User auswählen --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {trials.length === 0 ? (
            <p>Keine Trials aktiv.</p>
          ) : (
            trials.map((t) => {
              const details = trialDetails[t.id] || { judges: [], tally: { guilty: 0, not_guilty: 0 } };
              return (
                <div
                  key={t.id}
                  style={{
                    border: "1px solid #aaa",
                    padding: 12,
                    marginBottom: 12,
                    borderRadius: 6,
                    background: "#f8f8f8",
                  }}
                >
                  <p><strong>Post:</strong> {t.posts?.content || "Unbekannt"}</p>
                  <p><strong>Accused:</strong> {t.users?.username || "Unbekannt"}</p>
                  <p>Status: {t.status}</p>
                  <small>Erstellt: {new Date(t.created_at).toLocaleString()}</small>

                  <div style={{ marginTop: 10 }}>
                    <strong>Judges:</strong>{" "}
                    {details.judges.length === 0
                      ? "noch keine Daten"
                      : details.judges.map((j) => j.users?.username || j.user_id).join(", ")}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => handleVote(t.id, "audience", "guilty")}>👎 Audience Guilty</button>
                    <button onClick={() => handleVote(t.id, "audience", "not_guilty")} style={{ marginLeft: 6 }}>
                      👍 Audience Not Guilty
                    </button>
                    <button onClick={() => handleVote(t.id, "judge", "guilty")} style={{ marginLeft: 12 }}>
                      👩‍⚖️ Judge Guilty
                    </button>
                    <button onClick={() => handleVote(t.id, "judge", "not_guilty")} style={{ marginLeft: 6 }}>
                      👩‍⚖️ Judge Not Guilty
                    </button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <strong>Results:</strong> Guilty: {details.tally.guilty} | Not Guilty: {details.tally.not_guilty}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COURTROOM */}
      {tab === "courtroom" && (
        <div style={{ height: "600px", border: "1px solid #ccc" }}>
          <Courtroom />
        </div>
      )}
    </div>
  );
}

export default App;
