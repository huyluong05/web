import React from 'react';
export function DataStatus({ loading, error, onRetry }) {
  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex flex-wrap items-center gap-3"><span>{error}</span>{onRetry && <button type="button" className="font-semibold underline" onClick={onRetry}>Thử lại</button>}</div>;
  if (loading) return <p role="status" className="text-sm text-slate-500">Đang tải dữ liệu…</p>;
  return null;
}
