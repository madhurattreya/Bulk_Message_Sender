import { useState, useEffect } from "react";
import { useGetEmailConfig, useSaveEmailConfig, useTestEmailConfig, getGetEmailConfigQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EmailSetup() {
  const { data: config, isLoading } = useGetEmailConfig();
  const saveConfig = useSaveEmailConfig();
  const testConfig = useTestEmailConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromEmail: "",
    fromName: ""
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message?: string | null } | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        host: config.host || "",
        port: config.port || 587,
        secure: config.secure || false,
        username: config.username || "",
        password: "", // Never returned from server
        fromEmail: config.fromEmail || "",
        fromName: config.fromName || ""
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync({ data: formData });
      queryClient.invalidateQueries({ queryKey: getGetEmailConfigQueryKey() });
      toast({ title: "Email configuration saved" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to save configuration" });
    }
  };

  const handleTest = async () => {
    try {
      setTestResult(null);
      const res = await testConfig.mutateAsync({});
      setTestResult(res);
      if (res.success) {
        toast({ title: "Connection successful!" });
      } else {
        toast({ variant: "destructive", title: "Connection failed", description: res.message || "Check your credentials." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to test connection" });
    }
  };

  if (isLoading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Setup</h1>
        <p className="text-muted-foreground mt-2">Configure your SMTP server to send bulk emails.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Enter your email provider's SMTP credentials.</CardDescription>
            </div>
            {config?.configured && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                Configured
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input 
                value={formData.host} 
                onChange={e => setFormData({...formData, host: e.target.value})} 
                placeholder="smtp.sendgrid.net" 
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input 
                type="number" 
                value={formData.port} 
                onChange={e => setFormData({...formData, port: parseInt(e.target.value)})} 
                placeholder="587" 
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              checked={formData.secure} 
              onCheckedChange={checked => setFormData({...formData, secure: checked})} 
            />
            <Label>Use TLS/SSL (Secure)</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                placeholder="apikey" 
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder={config?.configured ? "•••••••• (Leave blank to keep existing)" : "Enter password"} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input 
                value={formData.fromName} 
                onChange={e => setFormData({...formData, fromName: e.target.value})} 
                placeholder="Acme Corp" 
              />
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input 
                value={formData.fromEmail} 
                onChange={e => setFormData({...formData, fromEmail: e.target.value})} 
                placeholder="hello@acme.com" 
              />
            </div>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "bg-green-50 border-green-200 text-green-900" : ""}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 !text-green-600" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
              {testResult.message && <AlertDescription>{testResult.message}</AlertDescription>}
            </Alert>
          )}

        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="secondary" onClick={handleTest} disabled={testConfig.isPending || (!config?.configured && !formData.host)}>
            {testConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={saveConfig.isPending || !formData.host}>
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
