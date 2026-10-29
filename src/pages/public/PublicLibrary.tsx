import { Link } from 'react-router-dom';
import { listOrgs, listPublicPolicies, listPublicRecords } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { allPolicies } from '@/lib/policyLibrary';
import { LibraryBrowser } from '@/components/LibraryBrowser';
import { Loading } from '@/components/ui';

export default function PublicLibrary() {
  const { data } = useData(async () => {
    const [records, orgs, policies] = await Promise.all([listPublicRecords(), listOrgs(), listPublicPolicies().catch(() => [])]);
    return { records, orgs, policies };
  });
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Implementation Library</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Verified records from member schools: what they tried, what it cost, how long approval took, what got in the way and whether it worked. Failures included. Published school policies sit alongside, marked Policy, with a link to each full original. Member schools can add their own projects and policies; <Link to="/join" className="font-bold underline">join the founding cohort</Link>.</p>
      <div className="mt-10">{data ? <LibraryBrowser records={data.records} orgs={data.orgs} hrefBase="/library" policies={allPolicies(data.policies)} /> : <Loading />}</div>
    </div>
  );
}
