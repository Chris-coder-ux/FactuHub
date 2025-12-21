'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Handle MFA verification
      if (requiresMFA && mfaToken) {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          mfaToken: mfaToken,
          isBackupCode: isBackupCode,
          redirect: false,
        });

        if (result?.error) {
          setError('Código de verificación inválido');
          return;
        }

        router.push('/');
        return;
      }

      if (isSignUp) {
        // Sign up
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Registration failed');
          return;
        }

        // Auto sign in after registration
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Login failed after registration');
          return;
        }

        router.push('/');
      } else {
        // Sign in with MFA support
        // First, try login to check if MFA is required
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginData.requiresMFA) {
          // MFA is required, show MFA input
          setRequiresMFA(true);
          setError('');
          return;
        }

        if (!loginResponse.ok || !loginData.success) {
          setError(loginData.error || 'Invalid credentials');
          return;
        }

        // If MFA not required or already verified, proceed with NextAuth
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          mfaToken: mfaToken || undefined,
          isBackupCode: isBackupCode,
          redirect: false,
        });

        if (result?.error) {
          if (result.error === 'MFA_REQUIRED') {
            setRequiresMFA(true);
            setError('');
          } else {
            setError('Invalid credentials');
          }
          return;
        }

        router.push('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? 'Create a new account to get started' 
              : 'Sign in to your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
            </div>
            
            {requiresMFA && !isSignUp && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="space-y-2">
                  <Label htmlFor="mfaToken">Código de verificación (6 dígitos)</Label>
                  <Input
                    id="mfaToken"
                    name="mfaToken"
                    type="text"
                    required
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isBackupCode"
                    checked={isBackupCode}
                    onChange={(e) => setIsBackupCode(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isBackupCode" className="text-sm">
                    Usar código de respaldo
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRequiresMFA(false);
                    setMfaToken('');
                    setIsBackupCode(false);
                  }}
                  className="w-full"
                >
                  Volver
                </Button>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Loading...' : (requiresMFA ? 'Verificar' : (isSignUp ? 'Sign Up' : 'Sign In'))}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}