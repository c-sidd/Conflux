import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api/client';
import { CheckCircle2, HardDrive, HelpCircle, KeyRound, Lock, Mail } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<'email' | 'question' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.getSecurityQuestion(email);
      setSecurityQuestion(res.security_question);
      setStep('question');
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve security question for this email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPasswordWithQuestion({
        email,
        security_answer: securityAnswer.trim(),
        new_password: newPassword,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your answer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white shadow-md mb-3">
          <HardDrive className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h2>
        <p className="mt-2 text-sm text-slate-600">
          Verify your security question to set a new password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-900">Password Reset Complete</h3>
              <p className="text-sm text-slate-600">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>
              <Link to="/login" className="inline-block mt-4">
                <Button variant="primary">Sign In</Button>
              </Link>
            </div>
          ) : step === 'email' ? (
            <form className="space-y-5" onSubmit={handleFetchQuestion}>
              <p className="text-sm text-slate-600">
                Enter your registered email address to find your security question.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
                Continue
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Back to sign in
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-semibold text-brand-800 uppercase tracking-wider">
                      Security Question
                    </span>
                    <p className="text-sm font-medium text-brand-950 mt-0.5">{securityQuestion}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Your Answer</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm"
                    placeholder="Enter your security answer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
                Update Password
              </Button>

              <div className="flex justify-between items-center text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="font-medium text-slate-600 hover:text-slate-900"
                >
                  Change Email
                </button>
                <Link to="/login" className="font-medium text-slate-600 hover:text-slate-900">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
