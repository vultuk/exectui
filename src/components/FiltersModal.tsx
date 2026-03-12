import { useTerminalDimensions } from "@opentui/react";
import type { AppFilters } from "../types";

type FiltersModalProps = {
  filters: AppFilters;
  issueCount: number;
  matchingIssueCount: number;
  onToggleOpenPrOnly: () => void;
  onClose: () => void;
};

export function FiltersModal({
  filters,
  issueCount,
  matchingIssueCount,
  onToggleOpenPrOnly,
  onClose,
}: FiltersModalProps) {
  const { width } = useTerminalDimensions();
  const modalWidth = Math.max(34, Math.min(62, width - 6));

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      backgroundColor="#03090d"
    >
      <box
        width={modalWidth}
        border
        borderStyle="double"
        borderColor="#f5b85c"
        backgroundColor="#0d1821"
        padding={1}
        flexDirection="column"
        gap={1}
      >
        <text fg="#f5b85c">
          <strong>Filters</strong>
        </text>
        <text fg="#6f91a4">
          Ctrl+F or Esc closes this modal. Space or Enter toggles the active filter.
        </text>
        <box
          border
          borderStyle="single"
          borderColor={filters.openPrOnly ? "#f5b85c" : "#315a72"}
          backgroundColor={filters.openPrOnly ? "#173042" : "#10212b"}
          padding={1}
          focusable
          onMouseDown={onToggleOpenPrOnly}
        >
          <box flexDirection="column" gap={0}>
            <text fg={filters.openPrOnly ? "#f5b85c" : "#f9f6ef"}>
              <strong>{filters.openPrOnly ? "[x]" : "[ ]"} Issues with an open PR</strong>
            </text>
            <text fg="#6f91a4">
              {matchingIssueCount} matching issues out of {issueCount} open issues
            </text>
          </box>
        </box>
        <box flexDirection="row" justifyContent="space-between">
          <text fg="#8ed7c6">
            {filters.openPrOnly ? "Open-PR filter is enabled." : "Showing all open issues."}
          </text>
          <box
            border
            borderStyle="single"
            borderColor="#315a72"
            paddingX={1}
            focusable
            onMouseDown={onClose}
          >
            <text fg="#d9e5ec">Close</text>
          </box>
        </box>
      </box>
    </box>
  );
}
