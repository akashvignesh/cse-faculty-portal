import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, Can } from "@/components/auth/AuthProvider";
import { permissionsForRole, type Role } from "@/lib/permissions";

function mockMe(role: Role, userid = "jdoe", personNumber: string | null = "10000001") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          message: "ok",
          data: {
            userid,
            role,
            permissions: permissionsForRole(role),
            personNumber,
            devSwitcher: { enabled: false, roles: [] },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthProvider + Can", () => {
  it("shows permission-gated content for chair", async () => {
    mockMe("chair");
    render(
      <AuthProvider>
        <Can perm="faculty-leave:edit">
          <button>Edit leave</button>
        </Can>
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit leave" })).toBeVisible());
  });

  it("hides permission-gated content for viewer and shows the fallback", async () => {
    mockMe("viewer");
    render(
      <AuthProvider>
        <Can perm="faculty-leave:edit" fallback={<span>read-only</span>}>
          <button>Edit leave</button>
        </Can>
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("read-only")).toBeVisible());
    expect(screen.queryByRole("button", { name: "Edit leave" })).toBeNull();
  });

  it("resolves own-resource gates against the session identity", async () => {
    mockMe("faculty", "jdoe", "10000001");
    render(
      <AuthProvider>
        <Can resource="course-plan" owner="jdoe">
          <span>own plan editable</span>
        </Can>
        <Can resource="course-plan" owner="other" fallback={<span>not yours</span>}>
          <span>other plan editable</span>
        </Can>
        <Can resource="course-plan" owner="10000001">
          <span>own person-number editable</span>
        </Can>
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("own plan editable")).toBeVisible());
    expect(screen.getByText("not yours")).toBeVisible();
    expect(screen.getByText("own person-number editable")).toBeVisible();
    expect(screen.queryByText("other plan editable")).toBeNull();
  });

  it("denies everything when /me fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 }))
    );
    render(
      <AuthProvider>
        <Can perm="course-tags:edit" fallback={<span>denied</span>}>
          <span>allowed</span>
        </Can>
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("denied")).toBeVisible());
    expect(screen.queryByText("allowed")).toBeNull();
  });
});
