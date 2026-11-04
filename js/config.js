/**
 * DEFAULT CONFIGURATION
 * Edit this file to change the default content before first launch.
 * After first launch, settings are stored in LocalStorage.
 */

const DEFAULT_CONFIG = {
  // ── COUPLE INFO ──
  nameA: 'Bạn A',
  nameB: 'Bạn B',
  startDate: '',             // Set by the couple after sign-in
  avatarA: '',               // Base64 or URL
  avatarB: '',               // Base64 or URL

  // ── SETTINGS ──
  theme: 'deep-blue',        // 'deep-blue' | 'midnight' | 'pastel-sky' | 'sunset'
  bgEffect: 'hearts',        // 'hearts' | 'clouds' | 'fireflies' | 'petals'

  // ── PLAYLIST ──
  playlist: [
  ],

  // ── LOVE TIMELINE ──
  timeline: [],

  // ── PHOTO GALLERY ──
  photos: [
    // Each: { id, src, caption }
    // Populated by user via Settings
  ],

  // ── MILESTONES (auto-calculated, but can override order) ──
  milestones: [
    { days: 50, label: '50 ngày' },
    { days: 100, label: '100 ngày yêu nhau' },
    { days: 200, label: '200 ngày hạnh phúc' },
    { days: 365, label: '1 năm kỷ niệm' },
    { days: 500, label: '500 ngày bên nhau' },
    { days: 730, label: '2 năm yêu' },
    { days: 1000, label: '1000 ngày' },
    { days: 1095, label: '3 năm yêu' },
    { days: 1461, label: '4 năm yêu' },
    { days: 1825, label: '5 năm yêu nhau' }
  ],

  // ── SPECIAL DAYS (recurring each year, month is 1-based) ──
  specialDays: [
    { month: 1, day: 1, label: 'Năm mới' },
    { month: 2, day: 14, label: 'Valentine' },
    { month: 3, day: 8, label: 'Quốc tế Phụ nữ' },
    { month: 3, day: 14, label: 'White Day' },
    { month: 6, day: 1, label: 'Quốc tế Thiếu nhi' },
    { month: 10, day: 20, label: 'Phụ nữ Việt Nam' },
    { month: 11, day: 19, label: 'Quốc tế Đàn ông' },
    { month: 12, day: 25, label: 'Giáng sinh' }
  ]
};

export default DEFAULT_CONFIG;
