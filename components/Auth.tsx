import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { UserProfile, Invite } from '../types';
import { UserRole } from '../types';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const getFriendlyErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'O formato do e-mail é inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'E-mail ou senha incorretos.';
            case 'auth/email-already-in-use':
                return 'Este e-mail já está em uso por outra conta.';
            case 'auth/weak-password':
                return 'A senha deve ter pelo menos 6 caracteres.';
            default:
                return 'Ocorreu um erro. Tente novamente.';
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else { // Registration Flow
                if (!name) {
                    setError('Seu nome completo é obrigatório.');
                    setLoading(false);
                    return;
                }

                // Check for pending invitation
                const invitesRef = collection(db, "invites");
                const q = query(invitesRef, where("email", "==", email.toLowerCase()), where("status", "==", "pending"));
                const querySnapshot = await getDocs(q);
                
                let invite: (Invite & {docId: string}) | null = null;
                if (!querySnapshot.empty) {
                    const inviteDoc = querySnapshot.docs[0];
                    invite = { docId: inviteDoc.id, ...inviteDoc.data() } as (Invite & {docId: string});
                }

                // Create user in Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });
                
                if (invite) {
                     // User is accepting an invitation
                    const invitedUserProfile: UserProfile = {
                        name,
                        matricula: 'N/A',
                        email: user.email!,
                        role: invite.role,
                        organizationId: invite.organizationId
                    };
                    await setDoc(doc(db, "users", user.uid), invitedUserProfile);
                    // Delete the invite
                    await deleteDoc(doc(db, "invites", invite.docId));

                } else {
                    // User is creating a new company
                    if (!companyName) {
                        // We need to delete the created auth user if company name is missing
                        await user.delete();
                        setError('O nome da empresa é obrigatório para criar uma nova conta.');
                        setLoading(false);
                        return;
                    }

                    // Create new organization
                    const orgRef = await addDoc(collection(db, "organizations"), {
                        name: companyName
                    });
                    
                    // Create user profile as ADMIN of the new organization
                    const newUserProfile: UserProfile = { 
                        name, 
                        matricula: 'N/A',
                        email: user.email!,
                        role: UserRole.ADMIN,
                        organizationId: orgRef.id
                    };
                    await setDoc(doc(db, "users", user.uid), newUserProfile);
                }
            }
        } catch (err: any) {
            console.error(err.code, err.message);
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                 <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-500">Follow-up CRM</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta ou aceite seu convite'}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8">
                    <form onSubmit={handleAuth} className="space-y-6">
                        {!isLogin && (
                            <>
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                                    Se você foi convidado para uma equipe, apenas preencha seu nome, e-mail e senha. O nome da empresa não é necessário.
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Nome da Empresa (se estiver criando uma)</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="mt-1 w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Seu Nome Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="mt-1 w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (isLogin ? 'Entrar' : 'Cadastrar')}
                        </button>
                    </form>
                    <p className="text-center text-sm text-gray-600 dark:text-slate-400 mt-6">
                        {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-blue-600 dark:text-blue-500 hover:underline ml-1">
                            {isLogin ? 'Cadastre sua empresa' : 'Faça login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
