import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

interface IntroCallIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROJECT_STAGES = [
  { value: "exploring", label: "Exploring / Evaluating Elsa" },
  { value: "poc", label: "Proof of Concept" },
  { value: "pre_production", label: "Pre-Production" },
  { value: "production", label: "Production" },
] as const;

const INTEREST_OPTIONS = [
  { id: "architecture", label: "Architecture or system design guidance" },
  { id: "workflow_modeling", label: "Workflow modeling and orchestration" },
  { id: "troubleshooting", label: "Production troubleshooting" },
  { id: "designer", label: "Designer customization" },
  { id: "advisory", label: "Ongoing advisory / retained support" },
] as const;

export function IntroCallIntakeDialog({ open, onOpenChange }: IntroCallIntakeDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [projectStage, setProjectStage] = useState<string>("");
  const [currentUsage, setCurrentUsage] = useState("");
  const [discussionTopics, setDiscussionTopics] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  // Check for existing request when dialog opens
  useEffect(() => {
    if (open && user?.email) {
      checkExistingRequest();
    }
  }, [open, user?.email]);

  // Pre-fill email from user
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const checkExistingRequest = async () => {
    if (!user?.email) return;
    
    setCheckingExisting(true);
    try {
      const { data, error } = await supabase
        .from("intro_call_requests")
        .select("id, status")
        .eq("email", user.email)
        .not("status", "eq", "declined")
        .maybeSingle();
      
      if (error) throw error;
      setHasExistingRequest(!!data);
    } catch (err) {
      console.error("Error checking existing request:", err);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !companyName || !email || !projectStage || !currentUsage || !discussionTopics) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: insertedRequest, error } = await supabase
        .from("intro_call_requests")
        .insert({
          full_name: fullName,
          company_name: companyName,
          email: email,
          project_stage: projectStage,
          current_usage: currentUsage,
          discussion_topics: discussionTopics,
          interests: interests,
          user_id: user?.id || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Trigger notification to provider admins (fire and forget)
      supabase.functions.invoke("create-notification", {
        body: {
          recipientUserIds: [], // Will be populated by edge function based on provider
          type: "intro_call_submitted",
          title: "New Intro Call Request",
          message: `${fullName} from ${companyName} submitted an intro call request`,
          payload: {
            request_id: insertedRequest?.id,
            company_name: companyName,
            full_name: fullName,
            email: email,
            project_stage: projectStage,
          },
          actionUrl: "/dashboard/provider/customers", // TODO: Create dedicated view
        },
      }).catch((err) => {
        console.error("Failed to send intro call notification:", err);
      });

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error("Error submitting intake form:", err);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after closing
    setTimeout(() => {
      setIsSubmitted(false);
      setFullName("");
      setCompanyName("");
      setProjectStage("");
      setCurrentUsage("");
      setDiscussionTopics("");
      setInterests([]);
    }, 300);
  };

  // Success state
  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <DialogTitle className="text-xl mb-2">Thank You</DialogTitle>
            <DialogDescription className="text-base">
              We'll review your request and follow up to schedule the call.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-6">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Already has request state
  if (hasExistingRequest && !checkingExisting) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Already Submitted</DialogTitle>
            <DialogDescription>
              You've already submitted an introductory call request. We'll be in touch shortly to schedule your session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Introductory Call – Intake Form</DialogTitle>
          <DialogDescription>
            Please provide a bit of context so we can make the most of the call.
            This information is used only to assess fit and prepare the discussion.
          </DialogDescription>
        </DialogHeader>

        {checkingExisting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Organization Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company or organization"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectStage">Current Project Stage *</Label>
              <Select value={projectStage} onValueChange={setProjectStage} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your project stage" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentUsage">
                How are you currently using (or planning to use) Elsa Workflows? *
              </Label>
              <Textarea
                id="currentUsage"
                value={currentUsage}
                onChange={(e) => setCurrentUsage(e.target.value.slice(0, 500))}
                placeholder="Describe your current or planned use of Elsa Workflows..."
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {currentUsage.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discussionTopics">
                What would you like to discuss during this call? *
              </Label>
              <Textarea
                id="discussionTopics"
                value={discussionTopics}
                onChange={(e) => setDiscussionTopics(e.target.value)}
                placeholder="High-level architecture questions, production readiness, workflow modeling approach…"
                className="min-h-[100px]"
                required
              />
            </div>

            {/* Optional interests */}
            <div className="space-y-3">
              <Label>Which best describes your interest? (Optional)</Label>
              <div className="space-y-2">
                {INTEREST_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={interests.includes(option.id)}
                      onCheckedChange={() => handleInterestToggle(option.id)}
                    />
                    <label
                      htmlFor={option.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>
                This introductory call is intended for high-level discussion and engagement planning.
                It does not include hands-on technical problem solving, debugging, or implementation.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
