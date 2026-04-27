import { useRoute } from "wouter";
import { useGetCampaign, useListCampaignMessages } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

export function CampaignDetail() {
  const [match, params] = useRoute("/campaigns/:id");
  const id = match ? parseInt(params!.id, 10) : 0;

  const { data: campaign } = useGetCampaign(id, {
    query: { refetchInterval: (data) => (data?.status === 'running' || data?.status === 'queued') ? 2000 : false }
  });

  const { data: messages } = useListCampaignMessages(id, {
    query: { refetchInterval: () => (campaign?.status === 'running' || campaign?.status === 'queued') ? 2000 : false }
  });

  if (!campaign) return null;

  const progress = campaign.totalRecipients > 0 ? ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100 : 0;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={
              campaign.status === 'completed' ? 'default' :
              campaign.status === 'running' ? 'secondary' :
              campaign.status === 'failed' ? 'destructive' : 'outline'
            } className="uppercase tracking-wider px-2 py-0.5">
              {campaign.status}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(campaign.createdAt), "MMM d, HH:mm")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {campaign.channel === 'email' ? <Mail className="w-8 h-8 text-primary" /> : <MessageCircle className="w-8 h-8 text-green-500" />}
            {campaign.name}
          </h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Delivery Progress</h3>
            <div className="text-right">
              <span className="text-2xl font-bold">{campaign.sentCount + campaign.failedCount}</span>
              <span className="text-muted-foreground"> / {campaign.totalRecipients}</span>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Successfully Sent
              </div>
              <div className="text-2xl font-bold text-green-600">{campaign.sentCount}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-destructive" /> Failed
              </div>
              <div className="text-2xl font-bold text-destructive">{campaign.failedCount}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-500" /> Pending
              </div>
              <div className="text-2xl font-bold">{campaign.totalRecipients - campaign.sentCount - campaign.failedCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col flex-1 min-h-0 border rounded-lg bg-card">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Recipient Logs</h3>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages?.map(msg => (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium">{msg.recipientName || "Unknown"}</TableCell>
                  <TableCell className="font-mono text-sm">{msg.recipientAddress}</TableCell>
                  <TableCell>
                    {msg.status === 'sent' && <Badge className="bg-green-500 hover:bg-green-600 text-white">Sent</Badge>}
                    {msg.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                    {msg.status === 'pending' && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {msg.sentAt ? format(new Date(msg.sentAt), "HH:mm:ss") : "-"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate text-destructive">
                    {msg.error || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {messages?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Preparing recipients...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
