import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/dashboard";
import { Contacts } from "@/pages/contacts";
import { Templates } from "@/pages/templates";
import { EmailSetup } from "@/pages/email-setup";
import { WhatsappConnect } from "@/pages/whatsapp-connect";
import { Campaigns } from "@/pages/campaigns";
import { CampaignDetail } from "@/pages/campaign-detail";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/templates" component={Templates} />
        <Route path="/email" component={EmailSetup} />
        <Route path="/whatsapp" component={WhatsappConnect} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
