# Produk — CRUD & Bulk Upload Flows

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [access-context.md](./access-context.md) · [role-flows.md](./role-flows.md) · [module-status.md](./module-status.md)

<details>
<summary><strong>Master Data CRUD Flow (Standard Pattern)</strong></summary>

## Farmer CRUD Example (Applies to All Master Data)

```
User Access Module
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ List Page                                                            │
│  - Search + Filter (KT, Status, District)                           │
│  - DataTable (Pagination, Sort, Column Visibility)                  │
│  - Actions: View | Edit | Delete (based on permissions)             │
│  - Button: + Tambah (if has CREATE permission)                      │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           ├─ View → Detail Page (Read-only)
           │
           ├─ Edit → Modal Form
           │   │
           │   ├─ Zod Validation (client-side)
           │   ├─ Server Action (backend permission check)
           │   ├─ Execute Query (with RBAC filter)
           │   ├─ Add Audit Trail (modified_by, modified_at)
           │   └─ Success Toast + Refresh
           │
           ├─ Delete → Soft Delete Modal
           │   │
           │   ├─ Confirmation Dialog
           │   ├─ Update isActive = false
           │   ├─ Audit Trail
           │   └─ Refresh List
           │
           └─ Create → Modal Form
               │
               ├─ Zod Validation
               ├─ Server Action (hasPermission check)
               ├─ Insert with isActive = true
               ├─ Add Audit Trail (created_by, created_at)
               └─ Success Toast + Redirect/Refresh
```

### Key Patterns

- **Client-side validation**: Zod schemas in `src/validations/`
- **Backend permission validation**: `hasPermission(menuCode, permission)` in every action
- **RBAC filtering**: `AccessContext` discriminated union (ALL | BY_DISTRICT | BY_FARMER_GROUP)
- **Soft delete**: Update `isActive = false`, never hard delete
- **Audit trail**: Auto-set `created_by`, `modified_by`, `created_at`, `modified_at`

</details>

---

<details>
<summary><strong>Bulk Upload Flow (Farmer Pattern)</strong></summary>

## Bulk Upload Farmer (✅ Implemented)

```
User Access Bulk Upload
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 1: Select Context                                            │
│  - Choose Farmer Group (Searchable Combobox)                     │
│  - File input disabled until KT selected                          │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 2: Upload Excel File                                         │
│  - Upload .xlsx file                                              │
│  - Parse columns automatically                                    │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 3: Dynamic Column Mapping                                    │
│  - Auto-match columns (fuzzy match by name)                       │
│  - Manual override via dropdown                                   │
│  - Show preview of mapped fields                                  │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 4: Smart Validation                                          │
│  - Normalize gender (L/P → M/F)                                   │
│  - Clean NIK format (16 digits only)                              │
│  - Parse dates (Excel serial / dd/mm/yyyy / yyyy-mm-dd)          │
│  - Validate joinedYear (1900-2100)                                │
│  - Check uniqueness (file-level + DB-level)                       │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 5: Preview & Filter                                          │
│  - Show all rows with status (Valid | Error)                      │
│  - Filter: All | Valid Only | Error Only                          │
│  - Summary: X valid, Y errors                                     │
│  - Action buttons:                                                │
│    • Download Full (all rows + status column)                     │
│    • Download Errors Only (invalid rows + error messages)         │
│    • Save Valid Data                                              │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ├─ Download Full → Excel export (all rows + "Keterangan")
            │
            ├─ Download Errors Only → Excel export (errors + messages)
            │
            └─ Save Valid Data
                │
                ├─ Confirmation Dialog
                ├─ Bulk Insert (Transaction-based)
                ├─ Success Toast (X records saved)
                └─ Redirect to Farmer List
```

### Validation Tiers

1. **File-level**: Check duplicates within uploaded file
2. **DB-level**: Check existing records in database
3. **Format validation**: Zod schemas + normalization logic

</details>
