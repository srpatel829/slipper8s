import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Trophy } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-court p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-7 w-7 text-primary" />
            Slipper8s<sup className="text-[10px] align-super ml-0.5">TM</sup>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              A sign-in link has been sent to your email address. Click the link to sign in — it expires in 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Try again</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
