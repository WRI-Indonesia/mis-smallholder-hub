import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";

interface MockItem {
  id: string;
  name: string;
  email: string;
}

const mockColumns: DataTableColumn<MockItem>[] = [
  { key: "name", label: "Nama" },
  { key: "email", label: "Email" },
];

const mockData: MockItem[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
  { id: "3", name: "Charlie", email: "charlie@example.com" },
];

describe("DataTable", () => {
  it("renders table with data rows", () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        rowKey={(r) => r.id}
      />
    );

    expect(screen.getByText("Nama")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("renders empty state when data is empty", () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        rowKey={(r) => r.id}
        emptyMessage="No data found."
      />
    );

    expect(screen.getByText("No data found.")).toBeInTheDocument();
  });

  it("renders default empty message", () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        rowKey={(r) => r.id}
      />
    );

    expect(screen.getByText("Belum ada data.")).toBeInTheDocument();
  });

  it("filters data by search key", async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        rowKey={(r) => r.id}
        searchKey="name"
        searchPlaceholder="Cari nama..."
      />
    );

    const searchInput = screen.getByPlaceholderText("Cari nama...");
    await user.type(searchInput, "alice");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("renders action column when renderActions is provided", () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        rowKey={(r) => r.id}
        renderActions={(row) => <button>Edit {row.name}</button>}
      />
    );

    expect(screen.getByText("Aksi")).toBeInTheDocument();
    expect(screen.getByText("Edit Alice")).toBeInTheDocument();
    expect(screen.getByText("Edit Bob")).toBeInTheDocument();
  });

  it("uses custom column renderer", () => {
    const columnsWithRender: DataTableColumn<MockItem>[] = [
      {
        key: "name",
        label: "Nama",
        render: (row) => <strong data-testid={`bold-${row.id}`}>{row.name.toUpperCase()}</strong>,
      },
      { key: "email", label: "Email" },
    ];

    render(
      <DataTable
        columns={columnsWithRender}
        data={mockData}
        rowKey={(r) => r.id}
      />
    );

    expect(screen.getByText("ALICE")).toBeInTheDocument();
    expect(screen.getByTestId("bold-1")).toBeInTheDocument();
  });
});
