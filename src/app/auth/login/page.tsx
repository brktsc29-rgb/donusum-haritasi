import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Dönüşüm Haritası</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Kentsel dönüşüm saha takip sistemi
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
