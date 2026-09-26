import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Printer, 
  Globe, 
  ShieldCheck, 
  FileSpreadsheet, 
  Smartphone, 
  ArrowRight, 
  ExternalLink, 
  Check, 
  ChevronRight, 
  Menu, 
  X, 
  Laptop, 
  Lock, 
  BookOpen,
  Calendar,
  Layers,
  Database
} from 'lucide-react';
import { Logo } from '../components/ui/Logo';

export const PlatformLandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--app-bg,#f8fafc)] text-[var(--app-text,#1e293b)] font-sans antialiased overflow-x-hidden selection:bg-slate-200 selection:text-slate-900">
      
      {/* ─── 1. ANCHORED TOP NAVIGATION ───────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-md">
              <Logo size={32} variant="full" />
            </a>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              <a 
                href="#capabilities" 
                className="px-3 py-1.5 rounded-md hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                Capabilities
              </a>
              <a 
                href="#architecture" 
                className="px-3 py-1.5 rounded-md hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                Architecture
              </a>
              <a 
                href="#product-preview" 
                className="px-3 py-1.5 rounded-md hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                Interface
              </a>
              <a 
                href="/mobile" 
                className="px-3 py-1.5 rounded-md hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
              >
                Mobile
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">PWA</span>
              </a>
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a 
              href="/login" 
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </a>
            <a 
              href="https://demo.ifyspace.tech/login" 
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2 rounded-md transition-colors shadow-xs"
            >
              Explore Demo
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <a 
              href="/login" 
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              Sign In
            </a>
            <button 
              type="button" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[var(--app-border,#e2e8f0)] dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              <a 
                href="#capabilities" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Capabilities
              </a>
              <a 
                href="#architecture" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Architecture
              </a>
              <a 
                href="#product-preview" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Interface
              </a>
              <a 
                href="/mobile" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
              >
                <span>Mobile App Roadmap</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">PWA Active</span>
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <a 
                href="https://demo.ifyspace.tech/login" 
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 py-2.5 rounded-md shadow-xs"
              >
                Explore Live Demo
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO SECTION (CONTAINED, DISCIPLINED) ─────────────── */}
      <section className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            
            {/* Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span>Multi-Tenant School Management Platform · Version 2026.1</span>
            </div>

            {/* Primary Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.15]">
              Institutional Clarity & Academic Operations for Schools.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              GlobePen provides primary and secondary schools with dedicated white-label portals, verified registries for classes and faculty, automated term reporting, and tenant-isolated operations.
            </p>

            {/* Call to Action Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
              <a 
                href="https://demo.ifyspace.tech/login" 
                className="w-full sm:w-auto h-11 px-6 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                Explore Live Demo School
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a 
                href="/login" 
                className="w-full sm:w-auto h-11 px-6 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                Portal Sign In
              </a>
            </div>

            {/* Metadata Note */}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
              Pre-configured demo with real student records, grading keys, and report cards.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. PRODUCT GROUNDING (REALISTIC INTERFACE PREVIEW) ────── */}
      <section id="product-preview" className="py-12 sm:py-20 bg-[var(--app-bg,#f8fafc)] dark:bg-slate-950 border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Operational Interface
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Designed for daily administrative precision.
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Clean typography, high-density data tables, and strict separation between schools.
            </p>
          </div>

          {/* Structured Desktop Window Mockup */}
          <div className="max-w-5xl mx-auto rounded-lg border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            
            {/* Window Top Bar */}
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="ml-2 font-mono text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-none">
                  devickys.ifyspace.tech/registry
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>Tenant: Devickys Gem School</span>
              </div>
            </div>

            {/* Inner Dashboard View */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              
              {/* Header inside the interface */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">School Registry & Master Roster</h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                      Session 2025/2026
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Verified institutional records across primary and college divisions.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    6 Active Classes
                  </span>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                    Report Generator
                  </span>
                </div>
              </div>

              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Enrolled Scholars</span>
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">117</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Across JSS & SS arms</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Faculty Profiles</span>
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">16</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Assigned instructors</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Term Reports</span>
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">A4 Ready</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">WCAG contrast verified</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Isolation State</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Secure</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Hostname verified</p>
                </div>
              </div>

              {/* Data Table Mockup */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Admission No.</th>
                        <th className="py-2.5 px-3">Class Arm</th>
                        <th className="py-2.5 px-3 hidden sm:table-cell">Term Attendance</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">David Adeyemi</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">DGS-2024-042</td>
                        <td className="py-2.5 px-3">JSS 2 Alpha</td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">98.2% (112 / 114 days)</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Active
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">Chidinma Okonkwo</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">DGS-2023-019</td>
                        <td className="py-2.5 px-3">SS 1 Science</td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">96.5% (110 / 114 days)</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Active
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">Fatimah Aliyu</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">DGS-2024-088</td>
                        <td className="py-2.5 px-3">JSS 1 Gold</td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">100.0% (114 / 114 days)</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Active
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
                  <span>Showing 3 verified records · School isolation active</span>
                  <a href="/login" className="font-semibold text-slate-700 dark:text-slate-300 hover:underline">Open Full Registry →</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. CAPABILITIES (DISCIPLINED 6-GRID) ──────────────────── */}
      <section id="capabilities" className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12 sm:mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Core Capabilities
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Built for institutional rigor.
            </p>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              GlobePen removes administrative friction with dedicated tools for rosters, scoring, custom domains, and end-of-term reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Unified School Registry
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Centralize student enrollment records, faculty profiles, and class allocations across academic sessions. Synchronized safely across verified staff logins.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Print-Accurate Report Cards
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Automated score aggregation, psychomotor trait assessments, and remarks. Formatted strictly for single-page A4 printing with zero trailing blank sheets.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                White-Label School Portals
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Each school operates on its own dedicated subdomain or verified custom domain. Emblems, color palettes, and portal titles belong entirely to the institution.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Strict Multi-Tenancy Security
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tenancy resolution is validated server-side from trusted hostnames. Client requests cannot inject or manipulate foreign school identifiers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Assessment & Grading Protocols
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Record Continuous Assessment (CA) and terminal exam scores with automated total calculations, grade boundaries, and class position tracking.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Installable Web Experience (PWA)
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Install school workspaces directly to iOS, Android, or desktop devices. Operates in standalone mode with instantaneous launching and offline fallback notice.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 5. ARCHITECTURE & MULTI-TENANT TRUST MODEL ──────────── */}
      <section id="architecture" className="py-16 sm:py-24 bg-[var(--app-bg,#f8fafc)] dark:bg-slate-950 border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12 sm:mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              System Architecture
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              One reliable engine. Completely isolated schools.
            </p>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              GlobePen separates platform governance from individual school workspaces, ensuring high availability without data entanglement.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Architecture Card 1: School Workspaces */}
            <div className="p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Independent School Workspaces</h3>
                  <p className="text-xs text-slate-500">Autonomous operational presence for each client institution</p>
                </div>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Dedicated Hostname:</strong> Access via school subdomain or verified institution custom domain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Independent Identity:</strong> School logo, principal signature, motto, and custom brand colors.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Role-Based Portals:</strong> Distinct portals for School Administrators, Teachers, and Students.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Isolated Storage:</strong> Student, class, and grade entries are partitioned strictly by school ID.</span>
                </li>
              </ul>
            </div>

            {/* Architecture Card 2: Platform Infrastructure */}
            <div className="p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Central Platform Infrastructure</h3>
                  <p className="text-xs text-slate-500">Continuous security, maintenance, and distribution core</p>
                </div>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Zero Cache Leakage:</strong> Service worker explicitly bypasses authenticated API traffic (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/*</code>).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>HttpOnly Session Security:</strong> Authentication credentials issued via secure, partitioned cookies.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>DNS Verification Pipeline:</strong> Automated challenge checking before custom domains accept live traffic.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Automated Backup Protocols:</strong> Consistent database snapshots and rollback capability.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 6. MOBILE DIRECTION & ROADMAP ────────────────────────── */}
      <section className="py-12 sm:py-16 bg-white dark:bg-slate-900 border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Mobile Application Roadmap
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  In Development
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                GlobePen is currently installable on iOS and Android as a high-performance Progressive Web App. A companion native client focusing on offline roll-call attendance is currently in engineering.
              </p>
            </div>
            <div className="shrink-0">
              <a 
                href="/mobile" 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                View Mobile Roadmap
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FINAL CALL TO ACTION ──────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[var(--app-bg,#f8fafc)] dark:bg-slate-950 border-b border-[var(--app-border,#e2e8f0)] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Ready to explore GlobePen?
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
              Test our fully interactive demonstration environment featuring complete student registers, sample grading sheets, and report card generation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
              <a 
                href="https://demo.ifyspace.tech/login" 
                className="w-full sm:w-auto h-11 px-6 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                Access Demo Environment
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <a 
                href="/login" 
                className="w-full sm:w-auto h-11 px-6 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                Existing School Sign In
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. CONVENTIONAL FOOTER ───────────────────────────────── */}
      <footer className="py-12 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Logo size={28} variant="full" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-600 dark:text-slate-400">
              <a href="/login" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Portal Login</a>
              <a href="https://demo.ifyspace.tech/login" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Demo School</a>
              <a href="/mobile" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Mobile PWA</a>
              <a href="/manual" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Institutional Manual</a>
            </div>
          </div>
          
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-slate-400 dark:text-slate-500">
            <p>© {new Date().getFullYear()} GlobePen. Multi-School Management Platform.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>Production Pilot Environment</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
