import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteDialog } from "@/components/shared/delete-dialog";

describe("DeleteDialog", () => {
  it("renders dialog with default title and description", () => {
    render(
      <DeleteDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("Konfirmasi Hapus")).toBeInTheDocument();
    expect(
      screen.getByText("Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.")
    ).toBeInTheDocument();
    expect(screen.getByText("Batal")).toBeInTheDocument();
    expect(screen.getByText("Hapus")).toBeInTheDocument();
  });

  it("renders dialog with custom title and description", () => {
    render(
      <DeleteDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Hapus Pengguna"
        description="Pengguna akan dihapus permanen."
      />
    );

    expect(screen.getByText("Hapus Pengguna")).toBeInTheDocument();
    expect(screen.getByText("Pengguna akan dihapus permanen.")).toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DeleteDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when delete button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <DeleteDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByText("Hapus"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not render when open is false", () => {
    render(
      <DeleteDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText("Konfirmasi Hapus")).not.toBeInTheDocument();
  });
});
