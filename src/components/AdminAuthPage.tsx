import React, { useState } from 'react';
import { Shield, Lock, KeyRound, User, Mail, IdCard, UserPlus, LogIn, CheckCircle2, AlertCircle, Eye, EyeOff, Building2, ArrowLeft } from 'lucide-react';
import { AdminUser } from '../types';
import { TvriLogo } from './TvriLogo';

interface AdminAuthPageProps {
  onLoginSuccess: (admin: AdminUser) => void;
  registeredAdmins: (AdminUser & { passwordHash: string })[];
  onRegisterAdmin: (newAdmin: AdminUser & { passwordHash: string }) => void;
  onGoToPemohon: () => void;
}

export const AdminAuthPage: React.FC<AdminAuthPageProps> = ({
  onLoginSuccess,
  registeredAdmins,
  onRegisterAdmin,
  onGoToPemohon,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login states
  const [loginEmailOrNip, setLoginEmailOrNip] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register states
  const [regName, setRegName] = useState('');
  const [regNip, setRegNip] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('Katim Perlengkapan & Urusan Dalam');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const input = loginEmailOrNip.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!input || !pass) {
      setLoginError('Email / NIP dan Password wajib diisi.');
      return;
    }

    // Default built-in fallback admin check
    if (
      (input === 'admin@tvri.go.id' || input === 'admin' || input === '198501012010011001') &&
      (pass === 'admin123' || pass === 'admin' || pass === 'tvri123')
    ) {
      const defaultAdmin: AdminUser = {
        id: 'admin-default-1',
        name: 'Ahmad Subagyo, S.ST',
        nip: '198501012010011001',
        email: 'admin@tvri.go.id',
        role: 'Katim Perlengkapan & Urusan Dalam',
        createdAt: new Date().toISOString(),
      };
      onLoginSuccess(defaultAdmin);
      return;
    }

    // Match against registeredAdmins list
    const foundAdmin = registeredAdmins.find(
      (a) =>
        (a.email.toLowerCase() === input || a.nip.toLowerCase() === input) &&
        a.passwordHash === pass
    );

    if (foundAdmin) {
      const { passwordHash, ...adminUser } = foundAdmin;
      onLoginSuccess(adminUser);
    } else {
      setLoginError('Email / NIP atau Password Admin tidak terdaftar / salah. Silakan periksa kembali atau buat akun baru.');
    }
  };

  // Handle Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName.trim() || !regNip.trim() || !regEmail.trim() || !regPassword) {
      setRegError('Semua kolom bertanda bintang (*) wajib diisi.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password minimal 6 karakter demi keamanan akun admin.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    // Check if email or NIP already registered
    const existingEmail = registeredAdmins.some(
      (a) => a.email.toLowerCase() === regEmail.trim().toLowerCase()
    );
    if (existingEmail) {
      setRegError('Email ini sudah terdaftar sebagai akun Admin. Silakan gunakan tab Login.');
      return;
    }

    const existingNip = registeredAdmins.some(
      (a) => a.nip.trim() === regNip.trim()
    );
    if (existingNip) {
      setRegError('NIP ini sudah terdaftar sebagai akun Admin.');
      return;
    }

    // Create new admin account
    const newAdminRecord: AdminUser & { passwordHash: string } = {
      id: `admin-${Date.now()}`,
      name: regName.trim(),
      nip: regNip.trim(),
      email: regEmail.trim().toLowerCase(),
      role: regRole,
      createdAt: new Date().toISOString(),
      passwordHash: regPassword.trim(),
    };

    onRegisterAdmin(newAdminRecord);

    const { passwordHash, ...adminUser } = newAdminRecord;
    setRegSuccess('Pendaftaran Akun Admin Berhasil! Mengalihkan ke Panel Admin...');

    setTimeout(() => {
      onLoginSuccess(adminUser);
    }, 1200);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-10 px-4">
      
      {/* Upper Navigation link back to Pemohon */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs">
        <button
          onClick={onGoToPemohon}
          className="inline-flex items-center space-x-1.5 text-blue-700 hover:text-blue-900 font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Portal Pemohon</span>
        </button>

        <span className="text-slate-500 font-medium bg-slate-200/80 px-2.5 py-1 rounded-md text-[11px]">
          URL: <strong className="text-slate-800">/#admin</strong>
        </span>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Shield className="w-44 h-44 text-white" />
          </div>

          <div className="flex justify-center mb-3">
            <TvriLogo className="w-12 h-12" />
          </div>

          <h2 className="text-lg font-extrabold tracking-wide text-white">
            PORTAL ADMIN PERLENGKAPAN
          </h2>
          <p className="text-xs text-blue-200/90 mt-1 max-w-xs mx-auto">
            Sistem Informasi Aset Persediaan TVRI (SIAP TVRI)
          </p>

          {/* Mode Tabs */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-black/40 rounded-xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRegError('');
                setRegSuccess('');
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                authMode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Admin Baru</span>
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">

          {/* TAB 1: LOGIN ADMIN */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="font-bold text-slate-900 text-sm">Otorisasi Akun Administrator</h3>
                <p className="text-xs text-slate-500">Masukkan Email atau NIP terdaftar serta Password Admin Anda</p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email or NIP Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email atau NIP Admin
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: admin@tvri.go.id / 19850101..."
                    value={loginEmailOrNip}
                    onChange={(e) => setLoginEmailOrNip(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Admin
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 text-xs flex items-center justify-center space-x-2 transition-all mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>MASUK KE PANEL ADMIN</span>
              </button>

              {/* Preset Quick Access Box */}
              <div className="pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-indigo-600" />
                      <span>Akun Admin Demo Bawaan:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmailOrNip('admin@tvri.go.id');
                        setLoginPassword('admin123');
                      }}
                      className="text-blue-600 hover:underline font-bold text-[10px]"
                    >
                      Gunakan Akun Demo
                    </button>
                  </div>
                  <p>Email: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-slate-800">admin@tvri.go.id</code></p>
                  <p>Password: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-slate-800">admin123</code></p>
                </div>
              </div>

            </form>
          )}

          {/* TAB 2: REGISTER ADMIN BARU */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="text-center mb-1">
                <h3 className="font-bold text-slate-900 text-sm">Registrasi Admin Perlengkapan Baru</h3>
                <p className="text-xs text-slate-500">Lengkapi data pendaftaran akun petugas gudang / Katim TVRI</p>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Admin *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap beserta gelar"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* NIP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP / ID Pegawai *
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="18 digit NIP / ID Pegawai"
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Dinas / Resmi *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="nama@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ulangi Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Konfirmasi password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 text-xs flex items-center justify-center space-x-2 transition-all mt-3"
              >
                <UserPlus className="w-4 h-4" />
                <span>DAFTAR AKUN ADMIN BARU</span>
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
