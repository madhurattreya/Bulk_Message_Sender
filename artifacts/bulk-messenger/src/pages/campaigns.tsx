import { useState } from "react";
import { 
  useListCampaigns, 
  useCreateCampaign, 
  useListTemplates, 
  useGetDashboardSummary,
  getListCampaignsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { Plus, Send, Mail, MessageCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function Campaigns() {
  const [_, setLocation] = useLocation();
  const { data: campaigns, isLoading } = useListCampaigns();
  const { data: templates } = useListTemplates();
  const { data: summary } = useGetDashboardSummary();
  const createCampaign = useCreateCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    channel: "email" | "whatsapp";
    templateId: string;
    rateLimitMs: number;
  }>({
    name: "",
    channel: "email",
    templateId: "",
    rateLimitMs: 1500,
  });

  const filteredTemplates = templates?.filter(t => t.channel === formData.channel) || [];

  const handleChannelChange = (val: "email" | "whatsapp") => {
    setFormData({
      ...formData,
      channel: val,
      templateId: "",
      rateLimitMs: val === "email" ? 1500 : 4000
    });
  };

  const handleCreate = async () => {
    try {
      const res = await createCampaign.mutateAsync({
        data: {
          name: formData.name,
          channel: formData.channel,
          templateId: parseInt(formData.templateId, 10),
          rateLimitMs: formData.rateLimitMs
        }
      });
      toast({ title: "Campaign created and queued!" });
      queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      setIsDialogOpen(false);
      setLocation(`/campaigns/${res.id}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to create campaign" });
    }
  };

  const isReadyToStart = formData.channel === "email" ? summary?.emailConfigured : summary?.whatsappConnected;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-2">Send and monitor your bulk messages.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed">
          <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No campaigns yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Start your first campaign to send messages to your contacts.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Create Campaign</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns?.map(campaign => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${campaign.channel === 'email' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-600'}`}>
                      {campaign.channel === 'email' ? <Mail className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{format(new Date(campaign.createdAt), "MMM d, yyyy HH:mm")}</span>
                        <span>•</span>
                        <span>{campaign.totalRecipients.toLocaleString()} recipients</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-sm font-medium text-muted-foreground">Delivery</div>
                      <div className="font-mono text-lg">
                        <span className="text-green-600">{campaign.sentCount}</span> / {campaign.totalRecipients}
                      </div>
                    </div>
                    <Badge variant={
                      campaign.status === 'completed' ? 'default' :
                      campaign.status === 'running' ? 'secondary' :
                      campaign.status === 'failed' ? 'destructive' : 'outline'
                    } className="text-sm px-3 py-1">
                      {campaign.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. October Newsletter" />
            </div>
            
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={formData.channel} onValueChange={handleChannelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isReadyToStart && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  {formData.channel === "email" ? "Email SMTP is not configured. " : "WhatsApp device is not connected. "}
                  Please set it up before creating a campaign.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={formData.templateId} onValueChange={v => setFormData({...formData, templateId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.length === 0 && <SelectItem value="none" disabled>No templates available</SelectItem>}
                  {filteredTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Sending Delay (Rate Limit)</Label>
                <span className="text-sm text-muted-foreground font-mono">{formData.rateLimitMs} ms</span>
              </div>
              <Slider 
                value={[formData.rateLimitMs]} 
                min={500} 
                max={10000} 
                step={500} 
                onValueChange={([v]) => setFormData({...formData, rateLimitMs: v})} 
              />
              <p className="text-xs text-muted-foreground">
                Delay between each message to prevent getting banned. 
                Recommended: {formData.channel === 'email' ? '1.5s (1500ms)' : '4s (4000ms)'}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.templateId || !isReadyToStart || createCampaign.isPending}>
              {createCampaign.isPending ? "Starting..." : "Start Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
