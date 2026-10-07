import React from "react";
import { Plus } from "lucide-react";
import { Button } from "../common/Button";

export const UserHeader = ({
  title = "Daily",
  italicTitle = "Overview",
  subtitle,
  onRecordClick,
  actionText = "Ghi nhận chỉ số",
}) => {
  const today = new Date();
  const formattedDate =
    subtitle ||
    today.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {title} <span className="text-slate-500 font-medium">{italicTitle}</span>
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {formattedDate}
        </p>
      </div>
      {onRecordClick && (
        <Button
          variant="primary"
          size="md"
          onClick={onRecordClick}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          {actionText}
        </Button>
      )}
    </header>
  );
};
