import { listOrgs, listPublicRecords } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { POLICY_LIBRARY } from '@/lib/policyLibrary';
import { LibraryBrowser } from '@/components/LibraryBrowser';
import { Loading } from '@/components/ui';

export default function PublicLibrary() {
  const { data } = useData(async () => {
    const [records, orgs] = await Promise.all([listPublicRecords(), listOrgs()]);
    return { records, orgs };
  });
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Implementation Library</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Verified records from member schools: what they tried, what it cost, how long approval took, what got in the way and whether it worked. Failures included. Published school policies sit alongside, marked Policy, with a link to each full original.</p>
      <div className="mt-10">{data ? <LibraryBrowser records={data.records} orgs={data.orgs} hrefBase="/library" policies={POLICY_LIBRARY} /> : <Loading />}</div>
    </div>
  );
}
