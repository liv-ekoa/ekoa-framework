import { Link, useParams, useSearchParams } from 'react-router-dom';
import { listOrgs, listPublicRecords } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { LibraryBrowser } from '@/components/LibraryBrowser';
import { PolicyDetail, PolicyLibrary } from '@/components/PolicyLibrary';
import { Loading, Tabs } from '@/components/ui';

type Tab = 'policies' | 'records';

export default function PublicLibrary() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'records' ? 'records' : 'policies';
  const { data } = useData(async () => {
    const [records, orgs] = await Promise.all([listPublicRecords(), listOrgs()]);
    return { records, orgs };
  });
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Library</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Every sustainability policy schools in the network have adopted, ready to read and copy, and verified records of what schools tried, what it cost and whether it worked. Failures included. Member schools add their own; <Link to="/join" className="font-bold underline">join the founding cohort</Link>.</p>
      <div className="mt-8">
        <Tabs label="Library sections" value={tab} onChange={(k) => setParams(k === 'policies' ? {} : { tab: k })} tabs={[{ key: 'policies', label: 'Policies' }, { key: 'records', label: 'Project records', count: data?.records.length }]} />
        {tab === 'policies' ? <PolicyLibrary hrefBase="/library/policies" /> : data ? <LibraryBrowser records={data.records} orgs={data.orgs} hrefBase="/library" /> : <Loading />}
      </div>
    </div>
  );
}

export function PublicPolicy() {
  const { id } = useParams();
  return <div className="px-4 py-16 sm:px-6"><PolicyDetail id={id!} backTo="/library" /></div>;
}
