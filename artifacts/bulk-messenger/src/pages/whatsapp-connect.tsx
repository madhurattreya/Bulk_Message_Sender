import { useEffect } from "react";
import { useGetWhatsappStatus, useConnectWhatsapp, useLogoutWhatsapp, getGetWhatsappStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MessageCircle, Smartphone, AlertCircle, Loader2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WhatsappConnect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: status, isLoading } = useGetWhatsappStatus({
    query: { refetchInterval: 2000 } // Poll every 2s
  });
  
  const connectWhatsapp = useConnectWhatsapp();
  const logoutWhatsapp = useLogoutWhatsapp();

  const handleStartSession = async () => {
    try {
      await connectWhatsapp.mutateAsync({});
      toast({ title: "Starting session..." });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to start WhatsApp session" });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutWhatsapp.mutateAsync({});
      toast({ title: "Logged out from WhatsApp" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to log out" });
    }
  };

  if (isLoading && !status) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-green-700">WhatsApp Connect</h1>
        <p className="text-muted-foreground mt-2">Link your device to send bulk WhatsApp messages.</p>
      </div>

      <Card className="border-green-100 overflow-hidden">
        <div className="bg-green-50 p-6 border-b border-green-100 flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm">
            <MessageCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-900">Device Link</h2>
            <p className="text-sm text-green-700">Current state: <span className="font-mono bg-white px-2 py-0.5 rounded text-green-800 border border-green-200">{status?.state}</span></p>
          </div>
        </div>
        
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          {status?.state === "disconnected" && (
            <div className="text-center space-y-6 max-w-md">
              <Smartphone className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-medium mb-2">Not Connected</h3>
                <p className="text-muted-foreground">Start a session to generate a QR code, then scan it with your phone's WhatsApp app.</p>
              </div>
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleStartSession} disabled={connectWhatsapp.isPending}>
                {connectWhatsapp.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Start WhatsApp Session"}
              </Button>
            </div>
          )}

          {status?.state === "connecting" && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto" />
              <h3 className="text-xl font-medium">Generating QR Code...</h3>
              <p className="text-muted-foreground">Please wait a moment while we initialize the connection.</p>
            </div>
          )}

          {status?.state === "qr" && status.qrDataUrl && (
            <div className="text-center space-y-6">
              <div className="bg-white p-4 rounded-xl border-2 border-green-200 inline-block">
                <img src={status.qrDataUrl} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
              <div className="max-w-sm text-left bg-muted p-4 rounded-lg text-sm">
                <p className="font-medium mb-2 flex items-center gap-2"><Smartphone className="w-4 h-4"/> How to connect:</p>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Open WhatsApp on your phone</li>
                  <li>Tap <strong>Menu</strong> or <strong>Settings</strong></li>
                  <li>Select <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong></li>
                  <li>Point your phone to this screen to capture the code</li>
                </ol>
              </div>
            </div>
          )}

          {status?.state === "connected" && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-900 mb-1">Successfully Connected</h3>
                <p className="text-green-700 font-medium text-lg">{status.phoneNumber}</p>
              </div>
              <p className="text-muted-foreground">Your account is ready to send bulk messages.</p>
              <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-white mt-8" onClick={handleLogout} disabled={logoutWhatsapp.isPending}>
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect Device
              </Button>
            </div>
          )}

          {status?.state === "error" && (
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="text-xl font-medium text-destructive">Connection Error</h3>
              <p className="text-muted-foreground">{status.message || "An unknown error occurred."}</p>
              <Button onClick={handleStartSession} className="mt-4">Try Again</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ensure CheckCircle2 is imported properly
import { CheckCircle2 } from "lucide-react";
