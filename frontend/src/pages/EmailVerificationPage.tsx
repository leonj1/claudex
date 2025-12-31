import { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui';
import { useVerifyEmailMutation, useResendVerificationMutation } from '@/hooks/queries';
import { useAuthStore } from '@/store';
import { cn } from '@/utils/cn';

type VerificationState = 'pending' | 'verifying' | 'error' | 'success';

interface VerificationStatusProps {
  status: VerificationState;
  message: string;
  email: string;
  onResend: () => void;
  isResending: boolean;
}

const VerificationStatus = memo(function VerificationStatus({
  status,
  message,
  email,
  onResend,
  isResending,
}: VerificationStatusProps) {
  const navigate = useNavigate();

  const { icon, heading, headingClassName, subText } = useMemo(() => {
    switch (status) {
      case 'error':
        return {
          icon: <AlertCircle className="h-16 w-16 text-error-500 dark:text-error-400" />,
          heading: 'Verification Failed',
          headingClassName: 'text-error-600 dark:text-error-400',
          subText: message,
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-16 w-16 text-blue-600 dark:text-blue-400" />,
          heading: 'Email Verified',
          headingClassName: 'text-text-primary dark:text-text-dark-primary',
          subText: message || 'Your email has been verified successfully.',
        };
      case 'verifying':
        return {
          icon: <RefreshCw className="h-16 w-16 animate-spin text-blue-500 dark:text-blue-400" />,
          heading: 'Verifying...',
          headingClassName: 'text-blue-600 dark:text-blue-400',
          subText: 'Please wait while we verify your email...',
        };
      default:
        return {
          icon: <Mail className="h-16 w-16 text-blue-500 dark:text-blue-400" />,
          heading: 'Check Your Email',
          headingClassName: 'text-blue-600 dark:text-blue-400',
          subText: email
            ? `We sent a verification link to ${email}`
            : 'We sent a verification link to your email.',
        };
    }
  }, [email, message, status]);

  return (
    <Layout isAuthPage={true}>
      <div className="flex h-full flex-col bg-surface-secondary dark:bg-surface-dark-secondary">
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="relative z-10 w-full max-w-md space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">{icon}</div>

            <div className="relative rounded-xl border border-border bg-surface-tertiary p-6 shadow-2xl backdrop-blur-xl dark:border-border-dark dark:bg-surface-dark-tertiary">
              <div className="mb-6 space-y-2 text-center">
                <h2 className={cn('text-2xl font-bold', headingClassName)}>{heading}</h2>
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
                  {subText}
                </p>
              </div>

              {status === 'success' && (
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/10">
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
                    {message}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {(status === 'pending' || status === 'error') && (
                  <Button
                    onClick={onResend}
                    disabled={isResending}
                    variant="unstyled"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                )}

                {status === 'success' && (
                  <Button
                    onClick={() => navigate('/login')}
                    variant="gradient"
                    className="w-full transform shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                  >
                    Continue to Login
                  </Button>
                )}

                {status !== 'verifying' && status !== 'success' && (
                  <Button
                    onClick={() => navigate('/login')}
                    variant="unstyled"
                    className="flex h-10 w-full items-center justify-center rounded-lg bg-surface-tertiary text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-surface-hover dark:bg-surface-dark-tertiary dark:text-text-dark-secondary dark:hover:bg-surface-dark-hover"
                  >
                    Back to Login
                  </Button>
                )}
              </div>
            </div>

            {status === 'pending' && (
              <div className="space-y-1 text-center text-xs text-text-tertiary dark:text-text-dark-tertiary">
                <p>Can't find the email? Check your spam folder.</p>
                <p>The verification link will expire in 24 hours.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
});

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationState>('pending');
  const [message, setMessage] = useState('');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const verificationAttempted = useRef(false);

  const query = useMemo(() => {
    let email = searchParams.get('email')?.trim() ?? '';
    if (!email) {
      email = sessionStorage.getItem('pending_verification_email') ?? '';
    }
    return {
      email,
      verificationToken: searchParams.get('token'),
      alreadyVerified: searchParams.get('already_verified'),
      verificationFailed: searchParams.get('verification_failed'),
    };
  }, [searchParams]);

  const verifyEmailMutation = useVerifyEmailMutation({
    onSuccess: () => {
      sessionStorage.removeItem('pending_verification_email');
      setStatus('success');
      setMessage('Your email has been verified successfully. You can now log in.');
    },
    onError: (error) => {
      setStatus('error');
      setMessage(error.message || 'Verification failed. Please try again.');
    },
  });

  const resendMutation = useResendVerificationMutation({
    onSuccess: () => {
      setMessage('Verification email sent! Please check your inbox.');
      setStatus('pending');
    },
    onError: (error) => {
      setMessage(error.message || 'Failed to resend email. Please try again.');
      setStatus('error');
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (query.alreadyVerified === 'true') {
      navigate('/login');
    } else if (query.verificationFailed) {
      setStatus('error');
      if (query.verificationFailed === 'invalid_token') {
        setMessage('Invalid verification link. Please request a new one.');
      } else if (query.verificationFailed === 'expired_token') {
        setMessage('Verification link has expired. Please request a new one.');
      }
    }
  }, [navigate, query.alreadyVerified, query.verificationFailed]);

  useEffect(() => {
    if (query.verificationToken && status === 'pending' && !verificationAttempted.current) {
      verificationAttempted.current = true;
      setStatus('verifying');
      verifyEmailMutation.mutate({ token: query.verificationToken });
    }
  }, [query.verificationToken, status, verifyEmailMutation]);

  useEffect(() => {
    const hasContext =
      Boolean(query.email) ||
      Boolean(query.verificationToken) ||
      Boolean(query.verificationFailed) ||
      query.alreadyVerified === 'true';

    if (!hasContext) {
      navigate('/login');
    }
  }, [
    navigate,
    query.alreadyVerified,
    query.email,
    query.verificationFailed,
    query.verificationToken,
  ]);

  const handleResend = useCallback(() => {
    if (!query.email) return;
    setMessage('');
    setStatus('pending');
    resendMutation.mutate({ email: query.email });
  }, [query.email, resendMutation]);

  return (
    <VerificationStatus
      status={status}
      message={message}
      email={query.email}
      onResend={handleResend}
      isResending={resendMutation.isPending}
    />
  );
}
