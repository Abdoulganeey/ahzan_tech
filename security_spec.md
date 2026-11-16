# Ahzan Tech Ltd — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every `/buyers/{buyerId}`, `/rfqs/{rfqId}`, `/shipments/{shipmentId}`, and `/tradeDocuments/{docId}` record belongs exclusively to a single authenticated Firebase UID (`buyerUid == request.auth.uid`).
2. **Email Verification Enforcement**: All mutations (`create`, `update`) require `request.auth.token.email_verified == true`.
3. **Immutable Ownership & Creation Timestamps**: `buyerUid`, `refId`/`trackingCode`/`docCode`, and `createdAt` cannot be modified after creation (`incoming().field == existing().field`). Timestamps must match `request.time`.
4. **No PII Scraping (`list` Hardening)**: `/buyers/{buyerId}` forbids `list` queries (`allow list: if false;`). Collection `list` queries on `/rfqs`, `/shipments`, and `/tradeDocuments` explicitly enforce `resource.data.buyerUid == request.auth.uid` without `get()`/`exists()` lookups.
5. **Terminal State Locking**: Once an RFQ reaches `'Export Cleared'` or a shipment reaches `'Discharged at Port'`, client updates are rejected unless performed by the verified bootstrap admin (`abdoulganeey@gmail.com` with `email_verified == true`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Read `/rfqs/rfq-1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read (IDOR)**: User B calls `get` on `/buyers/userA` or `/rfqs/rfq-owned-by-A` -> `PERMISSION_DENIED`.
3. **Cross-Tenant List Scraping**: User B queries `/rfqs` without `where('buyerUid', '==', uidB)` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: User B creates `/rfqs/rfq-x` with `buyerUid: "userA"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: User A creates `/rfqs/rfq-x` adding `isApproved: true` or `role: "admin"` -> `PERMISSION_DENIED` (`keys().hasOnly(...)`).
6. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts `create` on `/rfqs/rfq-x` -> `PERMISSION_DENIED`.
7. **Spoofed Admin Email**: User with `email: "abdoulganeey@gmail.com"` and `email_verified: false` attempts admin read -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Create `/rfqs/abc$$$..1500chars` -> `PERMISSION_DENIED` (`isValidId()`).
9. **String Size Exhaustion**: Create `/rfqs/rfq-1` with 5,000-character `specifications` -> `PERMISSION_DENIED` (`<= 1000`).
10. **Timestamp Forgery**: Create `/rfqs/rfq-1` with past client `createdAt` != `request.time` -> `PERMISSION_DENIED`.
11. **Terminal State Tampering**: Buyer attempts to update an `'Export Cleared'` RFQ back to `'Submitted'` -> `PERMISSION_DENIED`.
12. **Immutable Field Reassignment**: Buyer updates `/rfqs/rfq-1` trying to change `buyerUid` or `refId` -> `PERMISSION_DENIED`.
