export function confirmRecordDeletion(recordLabel: string) {
  return window.confirm(`确认删除这条${recordLabel}？删除后可从历史记录恢复。`);
}
