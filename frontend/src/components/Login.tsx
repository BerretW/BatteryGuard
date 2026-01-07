import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';
import { authService } from '../services/authService';
import { useGoogleLogin } from '@react-oauth/google';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => { 
    e.preventDefault();
    setError('');

    if (isRegister) {
      await authService.register(name, email);
      setIsRegister(false);
      alert('Registrace proběhla. Vyčkejte na schválení administrátorem.');
    } else {
      const success = await authService.login(email, password);
      if (success) {
        onLogin();
      } else {
        setError('Neplatné přihlašovací údaje.');
      }
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // Získáme access_token z Google OAuth
      console.log("Google response:", tokenResponse);
      
      // V této konfiguraci backendu (viz bod 3) jsem použil verify_oauth2_token, 
      // který očekává ID Token. useGoogleLogin defaultně vrací Access Token.
      // Abychom se vyhnuli složité výměně kódů, upravím Backend (viz níže poznámka) 
      // nebo zde získáme data přímo.
      
      // Pro tento script pošleme access_token na backend a backend si sáhne pro user info.
      // (Je nutné mírně upravit backend v bodě 3, aby nepoužíval id_token.verify, ale requests.get userinfo, 
      //  pokud posíláme access token).
      
      // ALE: Bezpečnější je poslat ID Token. useGoogleLogin ho vrací jen při flow implicit s určitým nastavením.
      // POUŽIJEME PROTO JEDNODUŠŠÍ CESTU: Pošleme access token a backend se zeptá Googlu "kdo to je".
      
      try {
        const res = await fetch('/api/auth/google', { // Používáme relativní cestu /api díky Nginx proxy
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ token: tokenResponse.access_token })
        });
        
        if (!res.ok) throw new Error('Google login failed on server');

        const data = await res.json();
        if (data.token) {
           authService.saveToken(data.token); // Předpokládá existenci metody v authService (viz níže)
           // Musíme i uložit usera, authService.login to dělá interně, zde ručně:
           localStorage.setItem('bg_current_user', JSON.stringify(data.user));
           onLogin();
        }
      } catch (err) {
        console.error(err);
        setError('Chyba při přihlášení přes Google.');
      }
    },
    onError: () => setError('Google přihlášení selhalo.'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 text-center bg-slate-900 text-white">
          <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">BatteryGuard Pro</h1>
          <p className="text-slate-400 text-sm mt-2">Bezpečná správa technologií</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            {/* ... (Form inputs pro jméno, email, heslo zůstávají stejné) ... */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jméno a příjmení</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" required 
                  className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@appartus.cz"
                />
              </div>
            </div>
            {!isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password" required 
                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******"
                  />
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

            <button 
              type="submit" 
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isRegister ? 'Odeslat žádost' : 'Přihlásit se'}</span>
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Nebo</span></div>
          </div>

          <button 
            onClick={() => loginWithGoogle()}
            className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center space-x-2"
          >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
             <span>Přihlásit přes Google</span>
          </button>

          <p className="mt-8 text-center text-sm text-gray-500">
            {isRegister ? 'Už máte účet?' : 'Nemáte ještě účet?'}
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="ml-1 text-blue-600 font-bold hover:underline"
            >
              {isRegister ? 'Přihlaste se' : 'Zaregistrujte se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;