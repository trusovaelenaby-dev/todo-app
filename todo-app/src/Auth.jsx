import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [mode, setMode]       = useState("login"); // login | register | reset
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const handle = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Письмо с подтверждением отправлено на " + email);
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setSuccess("Письмо для сброса пароля отправлено на " + email);
      }
    } catch (e) {
      const msgs = {
        "Invalid login credentials": "Неверный email или пароль",
        "Email not confirmed": "Подтвердите email перед входом",
        "User already registered": "Пользователь с таким email уже зарегистрирован",
        "Password should be at least 6 characters": "Пароль должен быть не менее 6 символов",
      };
      setError(msgs[e.message] || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.card}>
        <div style={S.tag}>✦ ежедневный планировщик</div>
        <h1 style={S.title}>Мои задачи</h1>
        <p style={S.sub}>
          {mode === "login"    ? "Войдите, чтобы продолжить" :
           mode === "register" ? "Создайте аккаунт для синхронизации" :
                                 "Сброс пароля"}
        </p>

        <div style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input className="ainput" type="email" placeholder="you@example.com"
              value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handle()} autoFocus/>
          </div>

          {mode !== "reset" && (
            <div style={S.field}>
              <label style={S.label}>Пароль</label>
              <input className="ainput" type="password" placeholder="Минимум 6 символов"
                value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handle()}/>
            </div>
          )}

          {error   && <div style={S.error}>{error}</div>}
          {success && <div style={S.successMsg}>{success}</div>}

          <button className="abtn" onClick={handle} disabled={loading}>
            {loading ? "Загрузка..." :
             mode === "login"    ? "Войти →" :
             mode === "register" ? "Зарегистрироваться →" :
                                   "Отправить письмо →"}
          </button>
        </div>

        <div style={S.links}>
          {mode === "login" && <>
            <button className="alink" onClick={()=>{setMode("register");setError("");setSuccess("");}}>
              Нет аккаунта? Зарегистрироваться
            </button>
            <button className="alink" onClick={()=>{setMode("reset");setError("");setSuccess("");}}>
              Забыли пароль?
            </button>
          </>}
          {(mode === "register" || mode === "reset") && (
            <button className="alink" onClick={()=>{setMode("login");setError("");setSuccess("");}}>
              ← Вернуться ко входу
            </button>
          )}
        </div>

        <div style={S.hint}>
          Данные синхронизируются между всеми вашими устройствами
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
.ainput {
  font-family:'IBM Plex Mono',monospace; font-size:14px; color:#2d1f0f;
  background:#f5f0e8; border:1.5px solid #c4a97d; border-radius:8px;
  padding:11px 14px; outline:none; width:100%; transition:border-color .2s;
}
.ainput:focus { border-color:#c07b5a; box-shadow:0 0 0 3px rgba(192,123,90,.12); }
.abtn {
  font-family:'IBM Plex Mono',monospace; font-size:14px; padding:12px 0;
  width:100%; border:none; border-radius:8px; background:#3d2c1e; color:#f5f0e8;
  cursor:pointer; transition:background .2s, transform .15s; letter-spacing:.04em;
}
.abtn:hover:not(:disabled) { background:#5a3d28; }
.abtn:active { transform:scale(.98); }
.abtn:disabled { opacity:.5; cursor:default; }
.alink {
  font-family:'IBM Plex Mono',monospace; font-size:11px; background:none; border:none;
  color:#c07b5a; cursor:pointer; text-decoration:underline; padding:0;
}
.alink:hover { color:#8b3a1a; }
`;

const S = {
  root: {
    minHeight:"100vh", background:"#f5f0e8",
    backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(0,0,0,.025) 28px)",
    display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    fontFamily:"'IBM Plex Mono',monospace",
  },
  card: {
    width:"100%", maxWidth:420, background:"#fffdf7",
    borderRadius:16, padding:"36px 32px",
    boxShadow:"4px 4px 0 #c4a97d,8px 8px 0 #d9cdb8,0 24px 60px rgba(0,0,0,.1)",
    border:"1.5px solid #d9cdb8",
  },
  tag:   { fontSize:10, color:"#c07b5a", letterSpacing:".15em", textTransform:"uppercase", marginBottom:6 },
  title: { fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:"#2d1f0f", marginBottom:6 },
  sub:   { fontSize:12, color:"#8b7355", marginBottom:24, lineHeight:1.5 },
  form:  { display:"flex", flexDirection:"column", gap:14 },
  field: { display:"flex", flexDirection:"column", gap:6 },
  label: { fontSize:10, color:"#8b7355", letterSpacing:".1em", textTransform:"uppercase" },
  error: { fontSize:12, color:"#c0392b", background:"#fde8e8", border:"1px solid #f5c6c6", borderRadius:6, padding:"8px 12px" },
  successMsg: { fontSize:12, color:"#2e6e3a", background:"#e8f5e9", border:"1px solid #b8e0bc", borderRadius:6, padding:"8px 12px" },
  links: { display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginTop:18 },
  hint:  { fontSize:10, color:"#c4a97d", textAlign:"center", marginTop:20, lineHeight:1.6 },
};
