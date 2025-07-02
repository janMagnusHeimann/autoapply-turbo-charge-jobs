import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import GitHubCallback from "./pages/GitHubCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Clean up GitHub OAuth parameters if we're not on the callback route
    // This prevents unwanted OAuth processing on other routes
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.pathname.includes('/auth/github/callback') && 
        (currentUrl.searchParams.has('code') || currentUrl.searchParams.has('error'))) {
      console.log('Cleaning up GitHub OAuth parameters from non-callback route');
      currentUrl.searchParams.delete('code');
      currentUrl.searchParams.delete('error');
      currentUrl.searchParams.delete('state');
      window.history.replaceState({}, document.title, currentUrl.toString());
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/github/callback" element={<GitHubCallback />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
