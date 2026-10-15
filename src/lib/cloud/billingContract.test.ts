import { describe, expect, it } from "vitest";
import {
  ACADEMY_KIND,
  buildCloudCheckoutMetadata,
  canStartOrgCloudCheckout,
  classifyStripeDataObject,
  classifyStripeEvent,
  cloudBillingCustomerOwner,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  cloudPortalReturnPath,
  CONTROL_ORGANIZATION_METADATA_KEY,
  controlOrganizationIdFromHubOrg,
  HUB_ORGANIZATION_METADATA_KEY,
  HUB_USER_METADATA_KEY,
  isCloudCheckoutRequest,
  requireCloudOrganizationId,
  resolveControlOrganizationId,
  selectLinkedHubOrganization,
  shouldRecordHubOrder,
  stripeWebhookRoute,
} from "./billingContract";

describe("Cloud billing contract", () => {
  it("recognizes a Cloud checkout body and rejects Hub bundle checkout", () => {
    expect(isCloudCheckoutRequest({ productType: "cloud", organizationId: "org-1" })).toBe(true);
    expect(isCloudCheckoutRequest({ kind: "cloud" })).toBe(true);
    expect(isCloudCheckoutRequest({ bundleId: "b1", organizationId: "org-1" })).toBe(false);
    expect(isCloudCheckoutRequest({ productType: "academy" })).toBe(false);
  });

  it("rejects personal Cloud checkout", () => {
    expect(() => requireCloudOrganizationId(undefined)).toThrow(/requires an organization/);
    expect(() => requireCloudOrganizationId("")).toThrow(/requires an organization/);
  });

  it("puts Hub user/org and Control org on session metadata", () => {
    const metadata = buildCloudCheckoutMetadata({
      hubUserId: "user-1",
      hubOrganizationId: "hub-org-1",
      controlOrganizationId: "hub-org-1",
    });
    expect(metadata.kind).toBe("cloud");
    expect(metadata.product_type).toBe("cloud");
    expect(metadata[HUB_USER_METADATA_KEY]).toBe("user-1");
    expect(metadata[HUB_ORGANIZATION_METADATA_KEY]).toBe("hub-org-1");
    expect(metadata[CONTROL_ORGANIZATION_METADATA_KEY]).toBe("hub-org-1");
  });

  it("derives the Control org from the linked Hub org", () => {
    expect(controlOrganizationIdFromHubOrg("hub-org-1")).toBe("hub-org-1");
    expect(
      resolveControlOrganizationId({
        hubOrganizationId: "hub-org-1",
      }),
    ).toBe("hub-org-1");
    expect(
      selectLinkedHubOrganization([{ organization_id: "org-b", role: "admin" }], "org-foreign"),
    ).toMatchObject({ status: 403, code: "cloud_org_not_linked" });
    expect(selectLinkedHubOrganization([], "org-b")).toMatchObject({
      status: 403,
      code: "cloud_org_not_linked",
    });
    expect(
      selectLinkedHubOrganization([{ organization_id: "org-b", role: "admin" }], "org-b"),
    ).toEqual({ organizationId: "org-b" });
  });

  it("does not record Hub orders or credits for Cloud subscription events", () => {
    expect(
      shouldRecordHubOrder({
        type: "checkout.session.completed",
        data: { object: { metadata: { kind: "cloud" } } },
      }),
    ).toBe(false);
    expect(
      shouldRecordHubOrder({
        type: "invoice.paid",
        data: { object: { metadata: { billing_type: "recurring", order_id: "ord-1" } } },
      }),
    ).toBe(true);
  });

  it("routes Cloud first, then academy, then Hub billing_type", () => {
    expect(
      stripeWebhookRoute({
        type: "checkout.session.completed",
        data: { object: { metadata: { kind: "cloud", product_type: "cloud" } } },
      }),
    ).toBe("cloud");
    expect(
      stripeWebhookRoute({
        type: "checkout.session.completed",
        data: { object: { metadata: { kind: ACADEMY_KIND } } },
      }),
    ).toBe("academy");
    expect(
      stripeWebhookRoute({
        type: "checkout.session.completed",
        data: { object: { metadata: { billing_type: "recurring", bundle_id: "b1" } } },
      }),
    ).toBe("hub");
    expect(
      classifyStripeEvent({
        type: "customer.subscription.updated",
        data: { object: { metadata: { kind: "cloud" } } },
      }),
    ).toBe("cloud");
    expect(
      classifyStripeDataObject({ metadata: { billing_type: "recurring", bundle_id: "b1" } }),
    ).toBe("hub");
  });

  it("never lets org B resolve to org A or the admin's personal customer owner", () => {
    expect(cloudBillingCustomerOwner({ organizationId: "org-b", userId: "admin-1" })).toEqual({
      orgId: "org-b",
    });
    expect(cloudBillingCustomerOwner({ organizationId: "org-a", userId: "admin-1" })).toEqual({
      orgId: "org-a",
    });
    expect(cloudBillingCustomerOwner({ userId: "admin-1" })).toEqual({ userId: "admin-1" });
  });

  it("blocks non-admins from org Cloud checkout and keeps signed-in returns off public pricing", () => {
    expect(canStartOrgCloudCheckout(false)).toBe(false);
    expect(canStartOrgCloudCheckout(true)).toBe(true);
    expect(cloudCheckoutSuccessPath()).toBe("/cloud?payment=success");
    expect(cloudCheckoutCancelPath()).toBe("/cloud/billing?payment=cancelled");
    expect(cloudPortalReturnPath()).toBe("/cloud/billing");
    expect(cloudPortalReturnPath()).not.toMatch(/pricing|elsa-plus\/cloud-services/);
    expect(cloudCheckoutCancelPath()).not.toMatch(/pricing|elsa-plus\/cloud-services/);
  });
});
