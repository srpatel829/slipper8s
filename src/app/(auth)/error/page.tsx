import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Trophy } from "lucide-react"
import Link from "next/link"

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-court p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-7 w-7 text-primary" />
            Slipper8s
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>
              Something went wrong during sign-in. The link may have expired or already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/login">Try again</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
