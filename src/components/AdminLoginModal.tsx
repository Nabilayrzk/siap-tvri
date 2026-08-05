// import React, { useState } from 'react';
// import { Shield, Lock, X, Check, KeyRound } from 'lucide-react';

// interface AdminLoginModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSuccess: () => void;
// }

// export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
//   isOpen,
//   onClose,
//   onSuccess,
// }) => {
//   if (!isOpen) return null;

//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');

//   // Default admin PIN / Password: admin123 (or admin)
//   const handleLogin = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (password === 'admin' || password === 'admin123' || password === 'tvri123') {
//       setError('');
//       setPassword('');
//       onSuccess();
//     } else {
//       setError('Password / PIN Admin salah. Silakan coba lagi.');
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
//       <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
//         {/* Header */}
//         <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
//           <div className="flex items-center space-x-2">
//             <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
//               <Shield className="w-4 h-4" />
//             </div>
//             <div>
//               <h3 className="font-bold text-sm">Otorisasi Panel Admin</h3>
//               <p className="text-[11px] text-slate-400">Gudang Perlengkapan TVRI</p>
//             </div>
//           </div>
//           <button
//             type="button"
//             onClick={onClose}
//             className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
//           >
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Form Body */}
//         <form onSubmit={handleLogin} className="p-6 space-y-4">
//           <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start space-x-2">
//             <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
//             <p>
//               Halaman ini khusus untuk Admin & Katim Perlengkapan. Pemohon umum tidak perlu login untuk mengajukan barang.
//             </p>
//           </div>

//           <div>
//             <label className="text-xs font-semibold text-slate-700 block mb-1.5">
//               Masukkan Password / PIN Admin
//             </label>
//             <div className="relative">
//               <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
//               <input
//                 type="password"
//                 required
//                 autoFocus
//                 placeholder="Password (default: admin123)"
//                 value={password}
//                 onChange={(e) => {
//                   setPassword(e.target.value);
//                   setError('');
//                 }}
//                 className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-900"
//               />
//             </div>
//             {error && (
//               <p className="text-[11px] font-bold text-rose-600 mt-1.5 flex items-center gap-1">
//                 ⚠️ {error}
//               </p>
//             )}
//           </div>

//           <div className="pt-2 flex items-center justify-end space-x-2">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors"
//             >
//               Batal
//             </button>
//             <button
//               type="submit"
//               className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 text-xs flex items-center space-x-1.5 transition-all"
//             >
//               <Check className="w-4 h-4" />
//               <span>Masuk Admin</span>
//             </button>
//           </div>
//         </form>

//       </div>
//     </div>
//   );
// };
