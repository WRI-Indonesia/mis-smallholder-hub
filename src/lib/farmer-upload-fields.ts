/**
 * Field target + alias auto-match Upload Petani (dipindah dari komponen client,
 * #419) agar template Excel dan parser berbagi satu sumber dan teruji.
 * Pencocokan: header di-lowercase + trim lalu dicocokkan PERSIS ke alias.
 */
export const FARMER_UPLOAD_FIELDS = [
  { key: "farmerId", label: "ID Petani", required: true, desc: "Minimal 2 karakter" },
  { key: "name", label: "Nama Petani", required: true, desc: "Minimal 2 karakter" },
  { key: "gender", label: "Jenis Kelamin", required: true, desc: "L/P atau Laki-laki/Perempuan" },
  { key: "nik", label: "NIK", required: false, desc: "16 digit angka (opsional)" },
  { key: "birthPlace", label: "Tempat Lahir", required: false, desc: "Opsional" },
  { key: "birthDate", label: "Tanggal Lahir", required: false, desc: "Format tanggal (opsional)" },
  { key: "address", label: "Alamat", required: false, desc: "Opsional" },
  { key: "joinedYear", label: "Tahun Bergabung", required: false, desc: "Tahun 1900-2100 (opsional)" },
] as const;

export const FARMER_AUTO_MATCH_RULES: Record<string, string[]> = {
  farmerId: ["id petani", "farmer id", "id", "farmer_id", "kode petani", "kode_petani"],
  name: ["nama", "name", "nama petani", "farmer name", "fullname", "nama_petani"],
  gender: ["jenis kelamin", "gender", "sex", "lp", "l/p", "jk", "kelamin"],
  nik: ["nik", "no. ktp", "ktp", "national id", "no_ktp"],
  birthPlace: ["tempat lahir", "birth place", "birthplace", "tempat_lahir"],
  birthDate: ["tanggal lahir", "birth date", "birthdate", "tanggal_lahir", "tgl lahir", "tgl_lahir"],
  address: ["alamat", "address", "domisili"],
  joinedYear: ["tahun bergabung", "joined year", "joinedyear", "tahun_bergabung", "thn bergabung", "thn_bergabung"],
};
