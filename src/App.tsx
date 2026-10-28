import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DemoBanner, Forbidden } from "@/components/chrome";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { AppShell } from "@/components/shell";
import { SessionProvider, useSession } from "@/client/session";
import { AboutPage, HomePage, PrivacyPage, ProgrammePage } from "@/pages/public";
import { InvitationPage, LoginPage, ResetPasswordPage, ResetRequestPage } from "@/pages/auth";
import { DashboardPage } from "@/pages/dashboard";
import { ChallengesPage, CommunityPage, EventsPage, HelpPage, KnowledgePage, MembersPage, NotificationsPage, ProjectsPage, ThemesPage } from "@/pages/lists";
import { ProjectPage } from "@/pages/project";
import { ThemePage } from "@/pages/theme";
import { NotFoundPage } from "@/pages/not-found";

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a className="skip-link" href="#content">Skip to content</a>
      <PublicHeader />
      <main id="content" className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session.user) return <Navigate to="/login" replace />;
  const ready = Boolean(session.user.onboardingCompletedAt) || session.user.isAdmin;
  if (!ready && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (ready && location.pathname === "/onboarding") return <Navigate to="/dashboard" replace />;
  return (
    <>
      <a className="skip-link" href="#content">Skip to content</a>
      <DemoBanner show={Boolean(session.demonstration)} />
      <AppShell
        name={session.user.name}
        roles={session.user.roleLabel}
        phase={session.phase}
        unread={session.unread}
        showAdmin={Boolean(session.showAdmin)}
      >
        {children}
      </AppShell>
    </>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session.adminLinks.length) return <Forbidden />;
  return (
    <div>
      <nav aria-label="Administration" className="mb-8 flex gap-3 overflow-x-auto border-b border-line pb-3 text-sm">
        {session.adminLinks.map((link) => (
          <a key={link.href} className={location.pathname === link.href ? "whitespace-nowrap font-semibold text-teal" : "whitespace-nowrap text-navy hover:text-teal"} href={link.href}>{link.label}</a>
        ))}
      </nav>
      {children}
    </div>
  );
}

function Shell() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/programme" element={<PublicLayout><ProgrammePage /></PublicLayout>} />
        <Route path="/privacy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
        <Route path="/reset-password" element={<PublicLayout><ResetRequestPage /></PublicLayout>} />
        <Route path="/reset-password/:token" element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />
        <Route path="/register/invitation" element={<PublicLayout><InvitationPage /></PublicLayout>} />
        <Route path="/dashboard" element={<MemberLayout><DashboardPage /></MemberLayout>} />
        <Route path="/themes" element={<MemberLayout><ThemesPage /></MemberLayout>} />
        <Route path="/themes/:slug" element={<MemberLayout><ThemePage /></MemberLayout>} />
        <Route path="/projects/:id" element={<MemberLayout><ProjectPage /></MemberLayout>} />
        <Route path="/challenges" element={<MemberLayout><ChallengesPage /></MemberLayout>} />
        <Route path="/projects" element={<MemberLayout><ProjectsPage /></MemberLayout>} />
        <Route path="/help-requests" element={<MemberLayout><HelpPage /></MemberLayout>} />
        <Route path="/knowledge" element={<MemberLayout><KnowledgePage /></MemberLayout>} />
        <Route path="/events" element={<MemberLayout><EventsPage /></MemberLayout>} />
        <Route path="/community" element={<MemberLayout><CommunityPage /></MemberLayout>} />
        <Route path="/community/members" element={<MemberLayout><MembersPage /></MemberLayout>} />
        <Route path="/notifications" element={<MemberLayout><NotificationsPage /></MemberLayout>} />
        <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
      </Routes>
    </SessionProvider>
  );
}

export function App() {
  return <Shell />;
}

void AdminLayout;
