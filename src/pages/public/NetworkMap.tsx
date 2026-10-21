import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { listCohortMembers, listCohorts, listOrgs, listPublicRecords } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { Loading } from '@/components/ui';

export default function NetworkMap() {
  const { data, loading } = useData(async () => {
    const [orgs, records, cohorts, members] = await Promise.all([listOrgs(), listPublicRecords(), listCohorts(), listCohortMembers()]);
    return { orgs: orgs.filter((o) => o.public_visible && o.lat !== null), records, cohorts, members };
  });
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">The network</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Member schools and partners. Markers show the city only, never a school’s exact location.</p>
      {loading || !data ? (
        <Loading />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="h-[460px] overflow-hidden rounded-panel border border-paper-line">
            <MapContainer center={[15, 60]} zoom={2} minZoom={2} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {data.orgs.map((o) => (
                <CircleMarker key={o.id} center={[Math.round(o.lat! * 10) / 10, Math.round(o.lng! * 10) / 10]} radius={9} pathOptions={{ color: o.org_type === 'partner' ? '#8C4726' : '#36412F', fillColor: o.org_type === 'partner' ? '#CC7A4E' : '#5B6A3A', fillOpacity: 0.85, weight: 2 }}>
                  <Popup>
                    <strong>{o.name}</strong><br />{o.city}, {o.country}<br />
                    {o.org_type === 'partner' ? 'Partner' : `${data.records.filter((r) => r.org_id === o.id).length} published records`}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="space-y-4">
            {data.cohorts.map((c) => (
              <section key={c.id} className="rounded-panel border border-paper-line bg-white p-5">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {data.members.filter((m) => m.cohort_id === c.id).map((m) => {
                    const o = data.orgs.find((x) => x.id === m.org_id);
                    return o ? <li key={m.id} className="flex justify-between gap-3"><span className="font-bold text-ink">{o.name}</span><span className="text-ink-mute">{o.city}</span></li> : null;
                  })}
                </ul>
              </section>
            ))}
            <section className="rounded-panel border border-paper-line bg-white p-5">
              <h2 className="text-lg font-semibold">Partners</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.orgs.filter((o) => o.org_type === 'partner').map((o) => <li key={o.id} className="flex justify-between"><span className="font-bold">{o.name}</span><span className="text-ink-mute">{o.city}</span></li>)}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
