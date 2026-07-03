"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Check, X } from "lucide-react";
import { type CREATABLE_CUSTOM_FIELD_TYPES, type FieldDefinitionDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddColumnPopover } from "@/components/grid/add-column-popover";
import { listFieldDefinitions, createFieldDefinition } from "@/lib/field-definitions-api";
import {
  listCustomRecords,
  createCustomRecord,
  updateCustomRecord,
  deleteCustomRecord,
  getCustomTable,
} from "@/lib/custom-tables-api";
import { ApiError } from "@/lib/api-client";

export default function CustomTablePage({ params }: { params: Promise<{ tableKey: string }> }) {
  const { tableKey } = use(params);
  return <CustomTableGrid tableKey={tableKey} />;
}

interface EditingCell {
  recordId: string;
  fieldKey: string;
  value: string;
}

function CustomTableGrid({ tableKey }: { tableKey: string }) {
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const tableQuery = useQuery({
    queryKey: ["custom-tables", tableKey],
    queryFn: () => getCustomTable(tableKey),
  });

  const fieldsQuery = useQuery({
    queryKey: ["field-definitions", tableKey],
    queryFn: () => listFieldDefinitions(tableKey),
    staleTime: 30_000,
  });

  const recordsQuery = useQuery({
    queryKey: ["custom-records", tableKey],
    queryFn: () => listCustomRecords(tableKey, { limit: 500 }),
    staleTime: 5_000,
  });

  const createRecordMutation = useMutation({
    mutationFn: () => createCustomRecord(tableKey, { data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-records", tableKey] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể thêm bản ghi");
    },
  });

  const updateCellMutation = useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: Record<string, unknown> }) =>
      updateCustomRecord(recordId, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-records", tableKey] });
      setEditingCell(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể lưu");
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (recordId: string) => deleteCustomRecord(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-records", tableKey] });
      toast.success("Đã xoá bản ghi");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể xoá");
    },
  });

  type CreatableType = (typeof CREATABLE_CUSTOM_FIELD_TYPES)[number];
  const addFieldMutation = useMutation({
    mutationFn: (input: {
      label: string;
      fieldKey: string;
      fieldType: CreatableType;
      options?: Record<string, unknown>;
    }) => createFieldDefinition(tableKey, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-definitions", tableKey] });
      toast.success("Đã thêm cột");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể thêm cột");
    },
  });

  const fields = fieldsQuery.data ?? [];
  const records = recordsQuery.data?.items ?? [];
  const tableName = tableQuery.data?.name ?? tableKey;

  function startEdit(recordId: string, fieldKey: string, currentValue: unknown) {
    setEditingCell({ recordId, fieldKey, value: String(currentValue ?? "") });
  }

  function commitEdit() {
    if (!editingCell) return;
    updateCellMutation.mutate({
      recordId: editingCell.recordId,
      data: { [editingCell.fieldKey]: editingCell.value },
    });
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  if (tableQuery.isLoading || fieldsQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tableName}</h1>
        <Button size="sm" onClick={() => createRecordMutation.mutate()} disabled={createRecordMutation.isPending}>
          <Plus className="mr-1 size-4" />
          Thêm bản ghi
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80">
            <tr>
              <th className="w-10 border-b border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                #
              </th>
              {fields.map((f) => (
                <th
                  key={f.id}
                  className="border-b border-r px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  style={{ minWidth: f.width || 140 }}
                >
                  {f.label}
                </th>
              ))}
              <th className="border-b px-2 py-2">
                <AddColumnPopover
                  existingFields={fields}
                  onCreate={(input) => addFieldMutation.mutate(input)}
                />
              </th>
              <th className="w-10 border-b px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className="group border-b hover:bg-muted/30">
                <td className="border-r px-2 py-1 text-center text-xs text-muted-foreground">
                  {idx + 1}
                </td>
                {fields.map((f) => {
                  const isEditing =
                    editingCell?.recordId === record.id && editingCell?.fieldKey === f.fieldKey;
                  const cellValue = (record.data as Record<string, unknown>)[f.fieldKey];

                  return (
                    <td
                      key={f.id}
                      className="border-r px-2 py-1"
                      onDoubleClick={() => startEdit(record.id, f.fieldKey, cellValue)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-6 py-0 text-xs"
                            value={editingCell.value}
                            autoFocus
                            onChange={(e) =>
                              setEditingCell((prev) =>
                                prev ? { ...prev, value: e.target.value } : null,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            className="text-green-600 hover:text-green-700"
                            onClick={commitEdit}
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={cancelEdit}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="cursor-default select-text">
                          {cellValue !== undefined && cellValue !== null && cellValue !== ""
                            ? String(cellValue)
                            : ""}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1" />
                <td className="px-1 py-1">
                  <button
                    type="button"
                    title="Xoá bản ghi"
                    className="hidden group-hover:flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm("Xoá bản ghi này?")) deleteRecordMutation.mutate(record.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {records.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + 3}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Chưa có bản ghi nào.{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => createRecordMutation.mutate()}
                  >
                    Thêm bản ghi đầu tiên
                  </button>
                </td>
              </tr>
            )}

            {/* Add row */}
            <tr>
              <td colSpan={fields.length + 3}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
                  onClick={() => createRecordMutation.mutate()}
                >
                  <Plus className="size-3.5" />
                  Thêm bản ghi
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {recordsQuery.data && (
        <p className="mt-2 text-xs text-muted-foreground">
          {recordsQuery.data.total} bản ghi
        </p>
      )}
    </div>
  );
}
