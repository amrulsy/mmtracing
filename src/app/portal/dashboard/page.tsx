"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Wrench, Calendar, ChevronRight, Activity, ReceiptText } from "lucide-react";

interface Profile {
  id: number;
  name: string;
  phone: string;
  totalTrx: string;
  createdAt: string;
}

interface SPK {
  id: number;
  noSpk: string;
  status: string;
  progress: number;
  totalTagihan: string;
  sisaTagihan: string;
  createdAt: string;
}

interface Booking {
  id: number;
  jenisKendaraan: string;
  merkTipe: string;
  layanan: string;
  tanggal: string;
  jamPreferensi: string;
  status: string;
  createdAt: string;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("mmt_customer_token");
    if (!token) {
      router.push("/portal/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch("/api/v1/customer-auth/me", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/v1/customer-auth/history", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const profileData = await profileRes.json();
        const historyData = await historyRes.json();

        if (profileData.success) setProfile(profileData.data);
        else throw new Error("Invalid token");

        if (historyData.success) {
          setSpks(historyData.data.spk || []);
          setBookings(historyData.data.bookings || []);
        }
      } catch (err) {
        localStorage.removeItem("mmt_customer_token");
        router.push("/portal/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("mmt_customer_token");
    router.push("/portal/login");
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Profile */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-primary">
        <div>
          <h1 className="text-2xl font-black mb-1">Halo, {profile?.name} 👋</h1>
          <p className="text-sm text-muted-foreground">No. WA: {profile?.phone} | Bergabung sejak {new Date(profile?.createdAt || "").getFullYear()}</p>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors rounded-xl text-sm font-bold flex items-center gap-2">
          <LogOut size={16} /> Keluar
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* SPK Aktif / Riwayat */}
        <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 border-b border-surface-border pb-2">
            <Wrench className="text-primary" size={20} /> Riwayat Servis (SPK)
          </h2>
          {spks.length === 0 ? (
            <div className="p-8 text-center bg-surface-hover/30 border border-surface-border rounded-2xl">
              <ReceiptText size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Belum ada riwayat servis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {spks.map(spk => (
                <div key={spk.id} className="p-4 bg-surface-hover/50 border border-surface-border rounded-xl hover:bg-surface-hover transition-colors group cursor-default relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{spk.noSpk}</p>
                      <p className="text-sm font-medium mt-0.5">{new Date(spk.createdAt).toLocaleDateString('id-ID')}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      spk.status === 'selesai' ? 'bg-emerald-500/10 text-emerald-500' :
                      spk.status === 'batal' ? 'bg-red-500/10 text-red-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {spk.status}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                      <span>Progress Pengerjaan</span>
                      <span>{spk.progress}%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-1.5">
                      <div className={`h-full rounded-full transition-all ${spk.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${spk.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Riwayat Booking */}
        <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 border-b border-surface-border pb-2">
            <Calendar className="text-primary" size={20} /> Reservasi Saya
          </h2>
          {bookings.length === 0 ? (
            <div className="p-8 text-center bg-surface-hover/30 border border-surface-border rounded-2xl">
              <Calendar size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Belum ada booking online.</p>
              <button onClick={() => router.push('/#booking')} className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20">Buat Booking</button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="p-4 bg-surface-hover/50 border border-surface-border rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{b.layanan}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.jenisKendaraan} {b.merkTipe ? `- ${b.merkTipe}` : ''}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID') : 'Tanpa Tanggal'} {b.jamPreferensi ? `• ${b.jamPreferensi}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      b.status === 'selesai' ? 'bg-emerald-500/10 text-emerald-500' :
                      b.status === 'batal' ? 'bg-red-500/10 text-red-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
