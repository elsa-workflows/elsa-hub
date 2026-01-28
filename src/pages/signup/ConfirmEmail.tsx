import { Link, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  return (
    <Layout>
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base">
              {email ? (
                <>
                  We've sent a confirmation link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Click the link in the email to activate your account.
                </>
              ) : (
                <>
                  We've sent you a confirmation link. Click the link in the
                  email to activate your account.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>
                <strong>Didn't receive the email?</strong> Check your spam
                folder, or{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  try signing up again
                </Link>
                .
              </p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
