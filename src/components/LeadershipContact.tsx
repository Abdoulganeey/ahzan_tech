import { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Mail,
  MapPin,
  MessageSquare,
  UserCheck,
} from 'lucide-react';

interface LeadershipContactProps {
  onOpenDealRoom: () => void;
}

export default function LeadershipContact({
  onOpenDealRoom,
}: LeadershipContactProps) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      // Fallback: focus mailto if clipboard API is unavailable
    }
  };

  return (
    <section id="leadership" className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Executive Leadership Column */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-2">
                04. Executive Leadership &amp; Governance
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-4">
                Accountable Principal Oversight on Every Contract
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Ahzan Tech Ltd (incorporating AhzanEmporium, RC 2012723) operates with direct executive accountability from initial Letter of Intent through final SGS port release and Bill of Lading handover.
              </p>
            </div>

            <div className="p-6 sm:p-7 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
                    <UserCheck className="w-4 h-4" />
                    <span>Principal Signatory</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900">
                    Abdulganiyu Hamza
                  </h3>
                  <p className="text-sm font-medium text-slate-600">
                    Founder &amp; Chief Executive Officer · Ahzan Tech Ltd &amp; AhzanEmporium
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                Overseeing mineral tenure compliance (Licence No. 65197 EL), Nigerian agro-export aggregation, and cross-border wholesale distribution across West Africa, Europe, and East Asia.
              </p>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="block text-slate-500">Corporate Entity</span>
                  <span className="font-semibold text-slate-900">
                    Ahzan Tech Ltd (RC 2012723)
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Trading Division</span>
                  <span className="font-semibold text-slate-900">
                    AhzanEmporium Wholesale &amp; Export
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Corporate Channels Column */}
          <div
            id="contact"
            className="lg:col-span-6 bg-slate-900 text-white rounded-xl p-6 sm:p-8 border border-slate-800 space-y-6"
          >
            <div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">
                Direct Executive Desk &amp; Trade Channels
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Engage directly with our executive trade desk for Full Corporate Offers (FCO), assay verification dossiers, or wholesale distribution partnerships.
              </p>
            </div>

            {/* Direct Corporate Emails */}
            <div className="space-y-3">
              {[
                {
                  label: 'Executive Office & Mineral Offtake',
                  email: 'ceo@ahzan.tech',
                },
                {
                  label: 'International Trade & Wholesale Desk',
                  email: 'abdoul@ahzantechltd.com',
                },
              ].map((channel) => (
                <div
                  key={channel.email}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">{channel.label}</div>
                    <a
                      href={`mailto:${channel.email}`}
                      className="font-mono text-sm sm:text-base font-semibold text-white hover:text-amber-400 transition-colors inline-flex items-center gap-2 truncate"
                    >
                      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">{channel.email}</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyEmail(channel.email)}
                    aria-label={`Copy ${channel.email}`}
                    className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    {copiedEmail === channel.email ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Corporate Office Location */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-white text-sm">
                  Corporate Headquarters &amp; Export Coordination
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Abuja &amp; Lagos Trade Corridors, Federal Republic of Nigeria
                  <br />
                  Port Dispatch Terminals: Apapa Wharf · Tin Can Island · Onne Port
                </p>
              </div>
            </div>

            {/* Action Buttons: WhatsApp Business + Deal Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href="https://wa.me/2348000000000?text=Hello%20Ahzan%20Tech%20Ltd%20Trade%20Desk%2C%20I%20would%20like%20to%20inquire%20about%20a%20B2B%20commodity%20or%20wholesale%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Business</span>
              </a>

              <button
                type="button"
                onClick={onOpenDealRoom}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Open B2B Deal Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
