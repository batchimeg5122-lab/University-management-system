import { useEffect, useState, type FormEvent } from 'react';
import { DoorOpen, Plus } from 'lucide-react';
import { Badge, Button, DataTable, Input, Modal, PageHeader, Panel, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ROOM_TYPE_LABEL, type Room } from '@/features/rooms/api';
import { useRooms, useSaveRoom } from '@/features/rooms/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { BUILDINGS } from '@/features/schedules/lib/timetable';

const empty = { building: BUILDINGS[0], code: '', capacity: '40', room_type: 'lecture', note: '' };

export default function RoomsPage() {
  useDocumentTitle('Өрөө, танхим');
  const toast = useToast();
  const { can } = useRole();
  const { data, isLoading, error, refetch } = useRooms();
  const save = useSaveRoom();
  const [editing, setEditing] = useState<Room | 'new' | null>(null);
  const { values, bind, reset } = useFormState(empty);

  useEffect(() => {
    if (editing === 'new') reset(empty);
    else if (editing)
      reset({ building: editing.building, code: editing.code, capacity: String(editing.capacity), room_type: editing.room_type, note: editing.note ?? '' });
  }, [editing, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({
        ...(values as unknown as Partial<Room>),
        capacity: Number(values.capacity),
        id: editing && editing !== 'new' ? editing.id : undefined,
      });
      toast.success(editing === 'new' ? 'Өрөө нэмэгдлээ' : 'Өрөө шинэчлэгдлээ');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const totalSeats = data?.reduce((s, r) => s + r.capacity, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Өрөө, танхим"
        description="Хуваарь гаргахад эдгээр өрөөнөөс сонгоно. Багтаамж нь нэгдсэн лекц төлөвлөхөд ашиглагдана."
        actions={can('schedules') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Өрөө нэмэх</Button>}
      />
      <Panel flush title={data ? `${data.length} өрөө, нийт ${totalSeats} суудал` : undefined}>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={can('schedules') ? (r) => setEditing(r) : undefined}
          empty={{ icon: DoorOpen, title: 'Өрөө бүртгэгдээгүй байна', description: 'Хуваарь гаргахын өмнө өрөөнүүдээ нэмнэ үү.' }}
          columns={[
            { key: 'building', header: 'Байр', cell: (r) => r.building },
            { key: 'code', header: 'Өрөө', cell: (r) => <span className="num font-medium">{r.code}</span> },
            { key: 'type', header: 'Төрөл', cell: (r) => <Badge tone={r.room_type === 'lab' ? 'gold' : 'neutral'}>{ROOM_TYPE_LABEL[r.room_type]}</Badge> },
            { key: 'capacity', header: 'Багтаамж', align: 'right', cell: (r) => <span className="num">{r.capacity}</span> },
            { key: 'usage', header: 'Долоо хоногт', align: 'right', hideOnMobile: true, cell: (r) => <span className="num text-muted">{r.weekly_sessions ?? 0} цаг</span> },
            { key: 'note', header: 'Тэмдэглэл', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.note ?? '—'}</span> },
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="sm"
        title={editing === 'new' ? 'Өрөө нэмэх' : 'Өрөө засах'}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Болих</Button>
            <Button variant="primary" type="submit" form="room-form" loading={save.isPending}>Хадгалах</Button>
          </>
        }
      >
        <form id="room-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Select label="Байр" options={BUILDINGS.map((b) => ({ value: b, label: b }))} {...bind('building')} />
          <Input label="Өрөөний дугаар" required placeholder="305" {...bind('code')} />
          <Input label="Багтаамж" type="number" min={1} max={2000} required {...bind('capacity')} />
          <Select label="Төрөл" options={Object.entries(ROOM_TYPE_LABEL).map(([value, label]) => ({ value, label }))} {...bind('room_type')} />
          <Textarea label="Тэмдэглэл" wrapperClassName="sm:col-span-2" rows={2} placeholder="Проектортой, 2 самбартай" {...bind('note')} />
        </form>
      </Modal>
    </>
  );
}
