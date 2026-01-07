
import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, LogIn, Chrome } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      authService.register(name, email);
      setIsRegister(false);
      alert('Registrace proběhla. Vyčkejte na schválení administrátorem.');
    } else {
      const result = authService.login(email, password);
      if (result) {
        onLogin();
      } else {
        setError('Neplatné přihlašovací údaje.');
      }
    }
  };

  const handleGoogleLogin = () => {
    alert('Google Login API integration is ready. Client ID needed for production.');
  };

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
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jméno a příjmení</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  required 
                  className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@local.cz"
                />
              </div>
            </div>
            {!isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password" 
                    required 
                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin123"
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
            onClick={handleGoogleLogin}
            className="w-full py-3 border border-gray-200 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-50 transition"
          >
            <Chrome className="w-5 h-5 text-red-500" />
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
