import { Link, useParams } from 'react-router-dom';
import { getPublicRecord, listAdaptations, listOrgs, listProjects, listPublicRecords } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { RecordDetail } from '@/components/RecordDetail';
import { Empty, LinkButton, Loading } from '@/components/ui';

export default function PublicRecord() {
  const { id } = useParams();
  const { data, error } = useData(async () => {
    const r = await getPublicRecord(id!);
    const [orgs, adaptations, projects, records] = await Promise.all([listOrgs(), listAdaptations().catch(() => []), listProjects().catch(() => []), listPublicRecords()]);
    return { r, orgs, adaptations, projects, records };
  }, [id]);
  return (
    <div className="mx-auto max-w-page px-4 py-12 sm:px-6">
      <Link to="/library" className="text-sm font-bold text-ink-mute hover:text-ink">Back to the library</Link>
      <div className="mt-4">
        {error ? (
          <Empty title="This record is not public">It may be shared with member schools only. Members can sign in to read it.</Empty>
        ) : !data ? (
          <Loading />
        ) : (
          <RecordDetail
            r={data.r}
            org={data.orgs.find((o) => o.id === data.r.org_id) ?? null}
            orgs={data.orgs}
            adaptations={data.adaptations}
            projects={data.projects}
            records={data.records}
            actions={<><LinkButton to="/join" variant="dark">Want to adapt this at your school? Join</LinkButton><LinkButton to="/signin" variant="ghost">Members: sign in to adapt</LinkButton></>}
          />
        )}
      </div>
    </div>
  );
}
