import { useSearchParams } from 'react-router-dom';
import { listOrgs, listPublicRecords } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { LibraryBrowser } from '@/components/LibraryBrowser';
import { PolicyShelf } from '@/components/PolicyShelf';
import { Loading, Tabs } from '@/components/ui';
import { POLICY_LIBRARY } from '@/lib/policyLibrary';

type Tab = 'records' | 'policies';

export default function PublicLibrary() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'policies' ? 'policies' : 'records';
  const { data } = useData(async () => {
    const [records, orgs] = await Promise.all([listPublicRecords(), listOrgs()]);
    return { records, orgs };
  });
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Implementation Library</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Verified records from member schools: what they tried, what it cost, how long approval took, what got in the way and whether it worked. Failures included.</p>
      <div className="mt-8">
        <Tabs label="Library sections" value={tab} onChange={(k) => setParams(k === 'records' ? {} : { tab: k })} tabs={[{ key: 'records', label: 'Records', count: data?.records.length }, { key: 'policies', label: 'Policies', count: POLICY_LIBRARY.length }]} />
      </div>
      <div className="mt-8">
        {tab === 'policies' ? <PolicyShelf /> : data ? <LibraryBrowser records={data.records} orgs={data.orgs} hrefBase="/library" /> : <Loading />}
      </div>
    </div>
  );
}
