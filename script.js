// ============ 1. قاعدة البيانات (Auto-Seed) لتوليد بيانات تلقائية ============
let db;
try {
    // استخدمنا اسم تخزين جديد لتنظيف أي ملفات عالقة سابقة في المتصفح
    db = JSON.parse(localStorage.getItem('school_erp_final_v1'));
} catch (e) {
    db = null;
}

let dObj = new Date();
let todayISO = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');

if (!db || typeof db !== 'object') {
    db = {
        schoolName: '', schoolDate: '', theme: 'light',
        classes: [
            { id: 1, name: 'الأول الابتدائي', sections: [{id: 11, name: 'أ'}, {id: 12, name: 'ب'}] },
            { id: 2, name: 'الثاني الابتدائي', sections: [{id: 21, name: 'أ'}] }
        ],
        regions: [
            { id: 1, name: 'حي الزهور', driver: 'أحمد علي', phone: '07701234567', code: '101' },
            { id: 2, name: 'حي المعلمين', driver: 'محمد جاسم', phone: '07801234567', code: '102' }
        ],
        students: [
            { id: 1001, classId: 1, sectionId: 11, regId: '1055', name: 'علي حسين كاظم', phone: '07711111111', tuition: 1500000, regionCode: '101', payments: [{amount: 500000, date: todayISO}], grades: {}, siblings: [
                { regId: '1056', name: 'محمد حسين كاظم', classId: 2, sectionId: 21 }
            ]}
        ],
        staff: [
            { id: 1, name: 'ياسر محمود', role: 'مدرس لغة عربية', salary: 600000, payments: [{amount: 150000, date: todayISO}] }
        ],
        expenses: [
            { id: 1, desc: 'صيانة وتصليح', amount: 50000, date: todayISO }
        ]
    };
    localStorage.setItem('school_erp_final_v1', JSON.stringify(db));
}

let currentStudentId = null, editingStudentId = null, tempSiblings = [], editingStaffId = null;
const defaultSubjects = ['العربي','الرياضيات','الإنكليزي','الإسلامية','الكيمياء','الفيزياء','الاحياء','الفنية','الرياضة','الجرائم'];

// ============ 2. محرك التنبيهات 3D (SweetAlert2) ============
function customAlert(msg, icon = 'info') { 
    if(typeof Swal !== 'undefined') Swal.fire({ text: msg, icon: icon, confirmButtonText: 'موافق', customClass: { popup: 'swal2-glass' }}); 
    else alert(msg);
}
function customConfirm(msg, cb) { 
    if(typeof Swal !== 'undefined') Swal.fire({ text: msg, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم متأكد', cancelButtonText: 'إلغاء', customClass: { popup: 'swal2-glass' }}).then((res) => { cb(res.isConfirmed); }); 
    else cb(confirm(msg));
}
function customPrompt(msg, cb) { 
    if(typeof Swal !== 'undefined') Swal.fire({ title: msg, input: 'text', showCancelButton: true, confirmButtonText: 'تأكيد', cancelButtonText: 'إلغاء', customClass: { popup: 'swal2-glass' }}).then((res) => { cb(res.isConfirmed ? res.value : null); }); 
    else { let v = prompt(msg); cb(v); }
}

// ============ 3. التشغيل والدخول السريع (بدون ريفريش) ============
window.onload = () => {
    applyTheme(db.theme);
    if (!db.schoolName || db.schoolName.trim() === '') { 
        document.getElementById('setup-modal').classList.add('active'); 
    } else { 
        document.getElementById('setup-modal').classList.remove('active'); 
        document.getElementById('app').classList.remove('hidden'); 
        initApp(); 
    }
};

function saveDB() { localStorage.setItem('school_erp_final_v1', JSON.stringify(db)); }

function saveSetup() {
    let name = document.getElementById('setup-school-name').value;
    let date = document.getElementById('setup-school-date').value;
    
    if (!name || name.trim() === '') {
        alert('يرجى كتابة اسم المدرسة للبدء!');
        return;
    }
    
    // حفظ البيانات
    db.schoolName = name.trim(); 
    db.schoolDate = date; 
    saveDB(); 

    // إخفاء نافذة الدخول وإظهار النظام فورا بدون (location.reload)
    document.getElementById('setup-modal').classList.remove('active');
    document.getElementById('app').classList.remove('hidden');
    
    initApp();
    if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم تسجيل الدخول بنجاح', showConfirmButton:false, timer:2000});
}

function initApp() {
    if(!db.staff) db.staff = []; 
    if(!db.expenses) db.expenses = [];
    
    document.getElementById('display-school-name').innerHTML = `<i class="fas fa-university"></i> ${db.schoolName}`;
    document.getElementById('edit-school-name').value = db.schoolName; 
    document.getElementById('edit-school-date').value = db.schoolDate || '';
    
    // تعيين التواريخ الافتراضية
    document.getElementById('daily-date-filter').value = todayISO;
    document.getElementById('pay-date').value = todayISO;
    document.getElementById('exp-date').value = todayISO;

    // استدعاء كافة دوال الرسم
    renderClasses(); renderRegions(); renderStudents(); populateClassSelects(); updateRepSectionDropdown();
    renderDual(); renderDaily(); renderStaff(); renderExpenses();
}

function updateSchool() {
    db.schoolName = document.getElementById('edit-school-name').value; 
    db.schoolDate = document.getElementById('edit-school-date').value;
    saveDB(); 
    document.getElementById('display-school-name').innerHTML = `<i class="fas fa-university"></i> ${db.schoolName}`;
    customAlert('تم تحديث بيانات المدرسة بنجاح', 'success');
}

// نظام التبديل بين التبويبات السفلية
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    let tab = document.getElementById(`tab-${tabId}`);
    let nav = document.getElementById(`nav-${tabId}`);
    
    if(tab) tab.classList.add('active-tab'); 
    if(nav) nav.classList.add('active');
    
    // تحديث بيانات التبويبة المطلوبة
    if(tabId === 'students') renderStudents();
    if(tabId === 'reports') updateRepSectionDropdown();
    if(tabId === 'staff') renderStaff();
    if(tabId === 'expenses') renderExpenses();
    if(tabId === 'daily') renderDaily();
    if(tabId === 'dashboard') renderDual();
}

function toggleTheme() { db.theme = db.theme === 'light' ? 'dark' : 'light'; applyTheme(db.theme); saveDB(); }
function applyTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); }
function showModal(id) { document.getElementById(id).classList.add('active'); }
function hideModal(id) { document.getElementById(id).classList.remove('active'); }

// ============ 4. الإعدادات (الصفوف والمناطق) ============
function addClass() { let n=document.getElementById('new-class-name').value; if(!n)return; db.classes.push({id:Date.now(), name:n, sections:[]}); saveDB(); document.getElementById('new-class-name').value=''; initApp(); }
function deleteClass(id) { customConfirm('تأكيد حذف الصف بكافة شعبه؟', r=>{ if(r){db.classes=db.classes.filter(c=>c.id!==id); saveDB(); initApp();}}); }
function addSection(id) { customPrompt("اكتب اسم الشعبة الجديدة:", n=>{ if(n){db.classes.find(c=>c.id===id).sections.push({id:Date.now(),name:n}); saveDB(); initApp();}});}
function deleteSection(cId, sId) { customConfirm('حذف الشعبة؟', r=>{ if(r){let c=db.classes.find(x=>x.id===cId); c.sections=c.sections.filter(x=>x.id!==sId); saveDB(); initApp();}}); }
function renderClasses() {
    document.getElementById('classes-list').innerHTML = db.classes.map(c => `<div class="list-item"><div class="flex-between w-100 mb-1"><strong>${c.name}</strong> <div><button type="button" class="btn-3d success btn-small m-0" onclick="addSection(${c.id})"><i class="fas fa-plus"></i> شعبة</button> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteClass(${c.id})"><i class="fas fa-trash"></i></button></div></div><div>${c.sections.map(s => `<span class="glass p-1" style="display:inline-block; margin:2px; cursor:pointer;" ondblclick="deleteSection(${c.id},${s.id})">${s.name} ✖</span>`).join('')}</div></div>`).join('');
}
function addRegion() {
    let n=document.getElementById('reg-name').value, d=document.getElementById('reg-driver').value, p=document.getElementById('reg-phone').value, c=document.getElementById('reg-code').value;
    if(!n||!c) return customAlert("الاسم والرمز مطلوبان", 'warning');
    db.regions.push({id:Date.now(), name:n, driver:d, phone:p, code:c}); saveDB(); renderRegions(); ['reg-name','reg-driver','reg-phone','reg-code'].forEach(id=>document.getElementById(id).value='');
}
function deleteRegion(id) { customConfirm('تأكيد الحذف؟', r=>{ if(r){db.regions=db.regions.filter(x=>x.id!==id); saveDB(); renderRegions();} });}
function renderRegions() { document.getElementById('regions-list').innerHTML = db.regions.map(r => `<div class="list-item flex-between"><div><b>${r.name}</b> (الرمز: ${r.code})<br><small><i class="fas fa-bus"></i> السائق: ${r.driver} | ${r.phone}</small></div><button type="button" class="btn-3d danger btn-small m-0" onclick="deleteRegion(${r.id})"><i class="fas fa-trash"></i></button></div>`).join(''); }

// ============ 5. بيانات الطلاب الأساسية ============
function populateClassSelects() { let opts = '<option value="">اختر الصف</option>'+db.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); ['std-class','sib-class','rep-class'].forEach(id=>document.getElementById(id).innerHTML=opts); }
function updateSectionDropdown() { updateDropdown('std-class', 'std-section'); } function updateSibSectionDropdown() { updateDropdown('sib-class', 'sib-section'); } function updateRepSectionDropdown() { updateDropdown('rep-class', 'rep-section'); generateReport(); }
function updateDropdown(cId, sId, sVal=null) { let v=document.getElementById(cId).value, sel=document.getElementById(sId); sel.innerHTML='<option value="">اختر الشعبة</option>'; let c=db.classes.find(x=>x.id==v); if(c){ sel.innerHTML+=c.sections.map(s=>`<option value="${s.id}">${s.name}</option>`).join(''); if(sVal) sel.value=sVal;} }
function checkRegionCode() { let reg=db.regions.find(r=>r.code===document.getElementById('std-reg-code').value); document.getElementById('std-reg-name').value=reg?reg.name:''; document.getElementById('std-driver-name').value=reg?reg.driver:''; }

function openAddStudentModal() { editingStudentId=null; tempSiblings=[]; renderTempSiblings(); document.getElementById('std-modal-title').innerHTML='<i class="fas fa-user-plus"></i> إضافة طالب جديد'; ['std-class','std-section','std-reg','std-name','std-phone','std-fee','std-reg-code','std-reg-name','std-driver-name'].forEach(id=>document.getElementById(id).value=''); showModal('add-student-modal'); }
function editStudent(id) { editingStudentId=id; let s=db.students.find(x=>x.id===id); document.getElementById('std-modal-title').innerHTML='<i class="fas fa-user-edit"></i> تعديل طالب'; document.getElementById('std-class').value=s.classId; updateDropdown('std-class','std-section',s.sectionId); document.getElementById('std-reg').value=s.regId||''; document.getElementById('std-name').value=s.name; document.getElementById('std-phone').value=s.phone||''; document.getElementById('std-fee').value=s.tuition; document.getElementById('std-reg-code').value=s.regionCode||''; checkRegionCode(); tempSiblings=s.siblings?JSON.parse(JSON.stringify(s.siblings)):[]; renderTempSiblings(); showModal('add-student-modal'); }
function saveSiblingTemp() { let n=document.getElementById('sib-name').value; if(!n)return customAlert('اسم الأخ مطلوب', 'warning'); tempSiblings.push({regId:document.getElementById('sib-reg').value, name:n, classId:document.getElementById('sib-class').value, sectionId:document.getElementById('sib-section').value}); renderTempSiblings(); hideModal('add-sibling-modal'); ['sib-reg','sib-name','sib-class','sib-section'].forEach(id=>document.getElementById(id).value=''); }
function renderTempSiblings() { document.getElementById('siblings-temp-list').innerHTML=tempSiblings.map((s,i)=>`<div class="list-item flex-between p-2"><span><i class="fas fa-child"></i> ${s.name}</span> <button type="button" class="btn-3d danger btn-small m-0" onclick="tempSiblings.splice(${i},1); renderTempSiblings()"><i class="fas fa-trash"></i></button></div>`).join(''); }

function saveStudent() {
    let n=document.getElementById('std-name').value; if(!n) return customAlert('الاسم الثلاثي للطالب مطلوب','error');
    let d = { classId:document.getElementById('std-class').value, sectionId:document.getElementById('std-section').value, regId:document.getElementById('std-reg').value, name:n, phone:document.getElementById('std-phone').value, tuition:parseFloat(document.getElementById('std-fee').value)||0, regionCode:document.getElementById('std-reg-code').value, siblings:[...tempSiblings] };
    if(editingStudentId){ let idx=db.students.findIndex(x=>x.id===editingStudentId); d.id=db.students[idx].id; d.payments=db.students[idx].payments; d.grades=db.students[idx].grades; db.students[idx]=d; if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم التعديل',showConfirmButton:false,timer:1500}); } 
    else { d.id=Date.now(); d.payments=[]; d.grades={}; db.students.push(d); if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم الإضافة',showConfirmButton:false,timer:1500}); }
    saveDB(); hideModal('add-student-modal'); renderStudents(); renderDual();
}

function searchStudent() { renderStudents(document.getElementById('search-student').value); }
function renderStudents(filter="") {
    let html='';
    db.students.forEach(s=>{
        let matchM=s.name.includes(filter) || (s.regId && s.regId.includes(filter)); let matchS=(s.siblings||[]).find(sib=>sib.name.includes(filter));
        if(matchM || (filter!=="" && matchS)) {
            let cls=db.classes.find(c=>c.id==s.classId), paid=s.payments.reduce((sum,p)=>sum+p.amount,0);
            html+=`<div class="list-item flex-between" style="cursor:pointer;" onclick="openProfile(${s.id})"><div><strong><i class="fas fa-user-graduate text-primary"></i> ${s.name}</strong><br><small>الصف: ${cls?cls.name:'-'} | ذمة: <span style="color:#e74c3c">${(s.tuition-paid).toLocaleString()}</span></small></div><div class="flex-row"><button type="button" class="btn-3d warning btn-small m-0" onclick="event.stopPropagation(); editStudent(${s.id})"><i class="fas fa-pen"></i></button><button type="button" class="btn-3d danger btn-small m-0" onclick="event.stopPropagation(); deleteStudent(${s.id})"><i class="fas fa-trash"></i></button></div></div>`;
        }
        if(filter==="" || matchM || matchS){
            (s.siblings||[]).forEach(sib=>{
                if(filter==="" || sib.name.includes(filter) || matchM){
                    let sc=db.classes.find(c=>c.id==sib.classId);
                    html+=`<div class="list-item flex-between" style="cursor:pointer; background:rgba(0,0,0,0.05); border-right:4px solid #a777e3;" onclick="openProfile(${s.id})"><div><strong><i class="fas fa-child"></i> ${sib.name}</strong> <small style="color:#a777e3;">(أخو ${s.name})</small><br><small>الصف: ${sc?sc.name:''}</small></div><button type="button" class="btn-3d btn-small m-0" style="background:#a777e3;" onclick="event.stopPropagation(); openProfile(${s.id})"><i class="fas fa-folder-open"></i> الحساب</button></div>`;
                }
            });
        }
    }); document.getElementById('students-list').innerHTML=html || '<div class="text-center mt-3">لا يوجد طلاب</div>';
}
function deleteStudent(id) { customConfirm("حذف الطالب نهائياً من النظام (مع كافة سجلاته)؟", r=>{ if(r){db.students=db.students.filter(s=>s.id!==id); saveDB(); renderStudents(); renderDual();} }); }

// ============ 6. ملف الطالب المالي والدرجات ============
function openProfile(id) {
    currentStudentId=id; let s=db.students.find(x=>x.id===id); let c=db.classes.find(x=>x.id==s.classId), sec=c?c.sections.find(x=>x.id==s.sectionId):null;
    document.getElementById('prof-name').innerText=s.name; document.getElementById('prof-details').innerText=`الصف: ${c?c.name:'-'} | الشعبة: ${sec?sec.name:'-'} | موبايل: ${s.phone||'-'}`; document.getElementById('prof-reg').innerText=s.regId||'-';
    updateFinance(s); showModal('student-profile-modal');
}
function updateFinance(s) {
    let paid=s.payments.reduce((sum,p)=>sum+p.amount,0); document.getElementById('prof-total').innerText=s.tuition.toLocaleString(); document.getElementById('prof-paid').innerText=paid.toLocaleString(); document.getElementById('prof-rem').innerText=(s.tuition-paid).toLocaleString();
    document.getElementById('payments-history').innerHTML=s.payments.map((p,i)=>`<div class="list-item flex-between p-2"><span>${p.amount.toLocaleString()} د.ع | ${p.date}</span> <button type="button" class="btn-3d danger btn-small m-0" onclick="delPayment(${i})"><i class="fas fa-trash"></i></button></div>`).join('');
}
function submitPayment() { 
    let amt=parseFloat(document.getElementById('pay-amount').value), dt=document.getElementById('pay-date').value; 
    if(amt>0 && dt){ 
        let s=db.students.find(x=>x.id===currentStudentId); s.payments.push({amount:amt, date:dt}); saveDB(); document.getElementById('pay-amount').value=''; updateFinance(s); renderDual(); renderDaily(); 
        if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم تسديد الدفعة', showConfirmButton:false, timer:1500}); 
    } else { customAlert("يرجى إدخال المبلغ والتاريخ بشكل صحيح", "error"); }
}
function delPayment(i) { customConfirm('حذف الدفعة المحددة؟', r=>{ if(r){let s=db.students.find(x=>x.id===currentStudentId); s.payments.splice(i,1); saveDB(); updateFinance(s); renderDual(); renderDaily();} }); }

function openGrades() {
    let s=db.students.find(x=>x.id===currentStudentId); if(!s.grades)s.grades={}; if(!s.grades.subNames)s.grades.subNames=[...defaultSubjects];
    let html=`<table class="grades-tbl"><thead><tr class="bg-light"><th rowspan="2" class="bg-blue">المادة</th><th colspan="3">الفصل الأول</th><th rowspan="2" class="bg-yellow">معدل ف1</th><th rowspan="2">نصف السنة</th><th colspan="3">الفصل الثاني</th><th rowspan="2" class="bg-yellow">معدل ف2</th><th rowspan="2" class="bg-yellow">السعي السنوي</th><th rowspan="2">الامتحان النهائي</th><th rowspan="2" class="bg-yellow">الدرجة النهائية</th></tr><tr class="bg-light"><th>ش1</th><th>ش2</th><th>ش3</th><th>ش1</th><th>ش2</th><th>ش3</th></tr></thead><tbody>`;
    for(let i=0; i<10; i++){ let g=s.grades[i]||{}; html+=`<tr><td><input type="text" id="g_sub_${i}" value="${s.grades.subNames[i]||''}" class="sub-name" oninput="calcCols()"></td><td><input type="number" id="g_${i}_m11" value="${g.m11||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m12" value="${g.m12||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m13" value="${g.m13||''}" oninput="calcRow(${i});calcCols();"></td><td class="bg-yellow"><input type="number" id="g_${i}_avg1" value="${g.avg1||''}" readonly></td><td><input type="number" id="g_${i}_mid" value="${g.mid||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m21" value="${g.m21||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m22" value="${g.m22||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m23" value="${g.m23||''}" oninput="calcRow(${i});calcCols();"></td><td class="bg-yellow"><input type="number" id="g_${i}_avg2" value="${g.avg2||''}" readonly></td><td class="bg-yellow"><input type="number" id="g_${i}_year" value="${g.year||''}" readonly></td><td><input type="number" id="g_${i}_final" value="${g.final||''}" oninput="calcRow(${i});calcCols();"></td><td class="bg-yellow"><input type="number" id="g_${i}_tot" value="${g.tot||''}" readonly></td></tr>`; }
    html+=`<tr class="bg-light"><td class="bg-yellow">المجموع</td><td class="bg-yellow"><input type="number" id="g_tot_m11" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m12" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m13" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_avg1" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_mid" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m21" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m22" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m23" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_avg2" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_year" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_final" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_tot" readonly></td></tr><tr class="bg-light"><td class="bg-yellow">المعدل</td><td class="bg-yellow"><input type="number" id="g_avg_m11" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m12" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m13" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_avg1" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_mid" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m21" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m22" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m23" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_avg2" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_year" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_final" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_tot" readonly></td></tr><tr><td>النتيجة</td><td colspan="12"><input type="text" id="g_footer" value="${s.grades['footer']||''}" style="width:100%; text-align:right;" placeholder="اكتب النتيجة هنا..."></td></tr></tbody></table>`;
    document.getElementById('grades-table-container').innerHTML=html; for(let i=0;i<10;i++)calcRow(i); calcCols(); showModal('grades-modal');
}
function calcRow(i) { let get=id=>{let v=parseFloat(document.getElementById(id).value); return isNaN(v)?null:v;}; let set=(id,v)=>{document.getElementById(id).value=(v!==null)?Math.round(v):'';}; let avg=arr=>{let f=arr.filter(x=>x!==null); return f.length?f.reduce((a,b)=>a+b)/f.length:null;}; let a1=avg([get(`g_${i}_m11`),get(`g_${i}_m12`),get(`g_${i}_m13`)]); set(`g_${i}_avg1`,a1); let a2=avg([get(`g_${i}_m21`),get(`g_${i}_m22`),get(`g_${i}_m23`)]); set(`g_${i}_avg2`,a2); let yr=avg([a1,get(`g_${i}_mid`),a2]); set(`g_${i}_year`,yr); let fn=get(`g_${i}_final`), tot=(yr!==null&&fn!==null)?(yr+fn)/2:null; set(`g_${i}_tot`,tot); }
function calcCols() { let cols=['m11','m12','m13','avg1','mid','m21','m22','m23','avg2','year','final','tot']; let vC=Array.from({length:10}).filter((_,i)=>document.getElementById(`g_sub_${i}`).value.trim()!=='').length||1; cols.forEach(c=>{ let sum=0, cnt=0; for(let i=0;i<10;i++){let v=parseFloat(document.getElementById(`g_${i}_${c}`).value); if(!isNaN(v)){sum+=v;cnt++;}} document.getElementById(`g_tot_${c}`).value=cnt>0?Math.round(sum):''; document.getElementById(`g_avg_${c}`).value=cnt>0?(sum/vC).toFixed(1).replace(/\.0$/,''):''; }); }
function saveGrades() { let s=db.students.find(x=>x.id===currentStudentId); s.grades.subNames=[]; for(let i=0;i<10;i++){ s.grades.subNames.push(document.getElementById(`g_sub_${i}`).value); s.grades[i]={m11:document.getElementById(`g_${i}_m11`).value, m12:document.getElementById(`g_${i}_m12`).value, m13:document.getElementById(`g_${i}_m13`).value, avg1:document.getElementById(`g_${i}_avg1`).value, mid:document.getElementById(`g_${i}_mid`).value, m21:document.getElementById(`g_${i}_m21`).value, m22:document.getElementById(`g_${i}_m22`).value, m23:document.getElementById(`g_${i}_m23`).value, avg2:document.getElementById(`g_${i}_avg2`).value, year:document.getElementById(`g_${i}_year`).value, final:document.getElementById(`g_${i}_final`).value, tot:document.getElementById(`g_${i}_tot`).value}; } s.grades['footer']=document.getElementById('g_footer').value; saveDB(); if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم حفظ الدرجات',showConfirmButton:false,timer:1500}); }

// ============ 7. الرواتب والموظفين ============
function openAddStaffModal() { editingStaffId=null; document.getElementById('staff-modal-title').innerHTML='<i class="fas fa-user-plus"></i> إضافة موظف'; ['staff-name','staff-role','staff-salary'].forEach(id=>document.getElementById(id).value=''); showModal('add-staff-modal'); }
function saveStaff() { let n=document.getElementById('staff-name').value, r=document.getElementById('staff-role').value, s=parseFloat(document.getElementById('staff-salary').value)||0; if(!n||s<=0) return customAlert('يرجى إدخال الاسم والراتب بشكل صحيح', 'error'); if(editingStaffId){ let idx=db.staff.findIndex(x=>x.id===editingStaffId); db.staff[idx].name=n; db.staff[idx].role=r; db.staff[idx].salary=s; } else { db.staff.push({ id:Date.now(), name:n, role:r, salary:s, payments:[] }); } saveDB(); hideModal('add-staff-modal'); renderStaff(); renderDual(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم الحفظ', showConfirmButton:false, timer:1500}); }
function editStaff(id) { editingStaffId=id; let s=db.staff.find(x=>x.id===id); document.getElementById('staff-modal-title').innerHTML='<i class="fas fa-edit"></i> تعديل موظف'; document.getElementById('staff-name').value=s.name; document.getElementById('staff-role').value=s.role; document.getElementById('staff-salary').value=s.salary; showModal('add-staff-modal'); }
function deleteStaff(id) { customConfirm("تأكيد حذف الموظف وكل سجلات مدفوعاته؟", r=>{ if(r){db.staff=db.staff.filter(x=>x.id!==id); saveDB(); renderStaff(); renderDual(); renderDaily();} }); }
function payStaff(id) { customPrompt("المبلغ المراد صرفه للموظف (د.ع):", amt=>{ let v=parseFloat(amt); if(v>0){ db.staff.find(x=>x.id===id).payments.push({amount:v, date:todayISO}); saveDB(); renderStaff(); renderDual(); renderDaily(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم صرف المبلغ بنجاح', showConfirmButton:false, timer:1500}); } }); }
function renderStaff() { document.getElementById('staff-list').innerHTML = db.staff.map(st => { let paid = st.payments.reduce((s,p)=>s+p.amount,0); return `<div class="list-item flex-between"><div><strong><i class="fas fa-user-tie text-primary"></i> ${st.name}</strong> <small>(${st.role})</small><br><small>الراتب: ${st.salary.toLocaleString()} | المصروف: <span style="color:#2ecc71">${paid.toLocaleString()}</span> | الباقي: <span style="color:#e74c3c">${(st.salary-paid).toLocaleString()}</span></small></div><div class="flex-row"><button type="button" class="btn-3d success btn-small m-0" onclick="payStaff(${st.id})"><i class="fas fa-hand-holding-usd"></i> صرف</button> <button type="button" class="btn-3d warning btn-small m-0" onclick="editStaff(${st.id})"><i class="fas fa-pen"></i></button> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteStaff(${st.id})"><i class="fas fa-trash"></i></button></div></div>`; }).join('') || '<div class="text-center mt-3">لا توجد بيانات</div>'; }

// ============ 8. المصروفات التشغيلية ============
function openAddExpenseModal() { document.getElementById('exp-desc').value=''; document.getElementById('exp-amount').value=''; document.getElementById('exp-date').value = todayISO; showModal('add-expense-modal'); }
function saveExpense() { let d=document.getElementById('exp-desc').value, a=parseFloat(document.getElementById('exp-amount').value)||0, dt=document.getElementById('exp-date').value; if(!d||a<=0) return customAlert('البيان والمبلغ مطلوبان', 'error'); db.expenses.push({id:Date.now(), desc:d, amount:a, date:dt}); saveDB(); hideModal('add-expense-modal'); renderExpenses(); renderDual(); renderDaily(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم حفظ المصروف', showConfirmButton:false, timer:1500}); }
function deleteExpense(id) { customConfirm("حذف هذا المصروف؟", r=>{ if(r){db.expenses=db.expenses.filter(x=>x.id!==id); saveDB(); renderExpenses(); renderDual(); renderDaily();} }); }
function renderExpenses() { document.getElementById('expenses-list').innerHTML = db.expenses.map(e => `<div class="list-item flex-between"><div><strong><i class="fas fa-minus-circle text-danger"></i> ${e.desc}</strong><br><small><i class="far fa-calendar"></i> ${e.date}</small></div><div class="flex-row"><b style="color:#e74c3c; font-size:16px;">${e.amount.toLocaleString()}</b> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></div></div>`).join(''); }

// ============ 9. الخلاصة اليومية والمركز المالي ============
function renderDaily() {
    let dVal = document.getElementById('daily-date-filter').value;
    let parts = dVal.split('-'); let dStrGB = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ''; 
    let tIn=0, tOut=0, details='';
    
    db.students.forEach(s => s.payments.forEach(p => { if(p.date===dVal || p.date===dStrGB) { tIn+=p.amount; details+=`<div class="list-item flex-between p-2"><span style="color:#2ecc71"><i class="fas fa-arrow-up"></i> قسط مستلم (${s.name})</span><b>${p.amount.toLocaleString()}</b></div>`; } }));
    db.staff.forEach(st => st.payments.forEach(p => { if(p.date===dVal || p.date===dStrGB) { tOut+=p.amount; details+=`<div class="list-item flex-between p-2"><span style="color:#e74c3c"><i class="fas fa-arrow-down"></i> راتب مصروف (${st.name})</span><b>${p.amount.toLocaleString()}</b></div>`; } }));
    db.expenses.forEach(e => { if(e.date===dVal || e.date===dStrGB) { tOut+=e.amount; details+=`<div class="list-item flex-between p-2"><span style="color:#e74c3c"><i class="fas fa-arrow-down"></i> نفقات (${e.desc})</span><b>${e.amount.toLocaleString()}</b></div>`; } });
    
    document.getElementById('daily-in').innerText = tIn.toLocaleString(); document.getElementById('daily-out').innerText = tOut.toLocaleString(); document.getElementById('daily-net').innerText = (tIn-tOut).toLocaleString();
    document.getElementById('daily-details').innerHTML = details || '<div class="text-center p-2" style="opacity:0.6;">لا توجد حركات مالية في هذا التاريخ</div>';
}

function renderDual() {
    let exp=0, col=0, sal=0, exs=0;
    db.students.forEach(s => { exp+=s.tuition; col+=s.payments.reduce((a,b)=>a+b.amount, 0); });
    db.staff.forEach(st => sal+=st.payments.reduce((a,b)=>a+b.amount, 0));
    db.expenses.forEach(e => exs+=e.amount);
    
    document.getElementById('dash-expected').innerText = exp.toLocaleString(); document.getElementById('dash-collected').innerText = col.toLocaleString();
    document.getElementById('dash-debt').innerText = (exp - col).toLocaleString(); document.getElementById('dash-salaries').innerText = sal.toLocaleString();
    document.getElementById('dash-expenses').innerText = exs.toLocaleString();
    
    let net = col - sal - exs; let netEl = document.getElementById('dash-net'); netEl.innerText = net.toLocaleString(); netEl.style.color = net>=0 ? '#2ecc71' : '#e74c3c';
}

// ============ 10. التقارير والطباعة ============
function generateReport() { let cId=document.getElementById('rep-class').value, sId=document.getElementById('rep-section').value; if(!cId||!sId){document.getElementById('report-list').innerHTML='';return;} let f=db.students.filter(s=>s.classId==cId && s.sectionId==sId).map(s=>({...s, isSib:false})); db.students.forEach(m=>{ (m.siblings||[]).forEach(sib=>{ if(sib.classId==cId && sib.sectionId==sId) f.push({name:sib.name, isSib:true, mName:m.name}); }); }); f.sort((a,b)=>a.name.localeCompare(b.name,'ar')); document.getElementById('report-list').innerHTML=f.map((s,i)=>`<div class="list-item"><b>${i+1}.</b> ${s.name} ${s.isSib?`<small style="color:red;">(أخ لـ ${s.mName})</small>`:''}</div>`).join(''); }

function exportReportExcel() { 
    try {
        let cId=document.getElementById('rep-class').value, sId=document.getElementById('rep-section').value; let c=db.classes.find(x=>x.id==cId), s=c?c.sections.find(x=>x.id==sId):null; if(!c||!s) return customAlert('اختر الصف والشعبة', 'warning'); let f=db.students.filter(x=>x.classId==cId && x.sectionId==sId).map(x=>({...x, isSib:false, ph:x.phone})); db.students.forEach(m=>{ (m.siblings||[]).forEach(sib=>{ if(sib.classId==cId && sib.sectionId==sId) f.push({name:sib.name, isSib:true, ph:m.phone}); }); }); f.sort((a,b)=>a.name.localeCompare(b.name,'ar')); let data=[[`تقرير الصف: ${c.name} - الشعبة: ${s.name}`],["التسلسل","اسم الطالب","ملاحظة","الموبايل"]]; f.forEach((x,i)=>{ data.push([i+1, x.name, x.isSib?'أخ/أخت':'', x.ph]); }); 
        let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "التقرير"); XLSX.writeFile(wb, `تقرير_${c.name}_${s.name}.xlsx`); 
    } catch(e) { customAlert("تأكد من توفر الاتصال بالإنترنت لتحميل ملف الإكسل", "error"); }
}

function printGrades() { 
    let s=db.students.find(x=>x.id===currentStudentId), c=db.classes.find(x=>x.id==s.classId); 
    document.querySelectorAll('#grades-table-container input').forEach(e=>e.setAttribute('value',e.value)); 
    let html = `
    <div style="font-family:Arial; padding:20px; direction:rtl;">
        <div style="display:flex; justify-content:space-between; background:#2c3e50; color:#fff; padding:15px; font-weight:bold; font-size:22px; border: 2px solid #000;">
            <span>${db.schoolName}</span>
            <span>الصف: ${c?c.name:''}</span>
        </div>
        <div style="text-align:center; background:#f1c40f; padding:15px; font-size:24px; font-weight:bold; border: 2px solid #000; border-top:none; margin-bottom:10px;">
            الطالب: <span style="color:#e74c3c;">${s.name}</span>
        </div>
        ${document.getElementById('grades-table-container').innerHTML}
    </div>`;
    document.getElementById('print-area').innerHTML = html; 
    window.print(); 
}

function printReceipt() {
    let s = db.students.find(x => x.id === currentStudentId);
    let c = db.classes.find(x => x.id == s.classId);
    let sc = c ? c.sections.find(x => x.id == s.sectionId) : null;
    let p = s.payments.reduce((a, b) => a + b.amount, 0);

    let siblingsHtml = '';
    if (s.siblings && s.siblings.length > 0) {
        siblingsHtml = s.siblings.map(sib => {
            let xC = db.classes.find(y => y.id == sib.classId);
            let xS = xC ? xC.sections.find(y => y.id == sib.sectionId) : null;
            return `<tr><td style="padding:10px; color:#e74c3c;">أخ/أخت</td><td>${sib.name}</td><td>${sib.regId || '-'}</td><td>${xC ? xC.name : ''}</td><td>${xS ? xS.name : ''}</td></tr>`;
        }).join('');
    }

    let html = `
    <div style="font-family:Arial; padding:20px; border:2px solid #000; width:95%; margin:auto; direction:rtl;">
        <div style="display:flex; justify-content:space-between; border-bottom:3px double #000; padding-bottom:15px; margin-bottom:15px;">
            <div><b>التاريخ:</b><br>${new Date().toLocaleDateString('en-GB')}</div>
            <h1 style="margin:0; color:#2c3e50;">${db.schoolName}</h1>
            <div><b>القيد:</b><br>${s.regId || '----'}</div>
        </div>
        <table style="width:100%; border-collapse:collapse; text-align:center; font-weight:bold; border:2px solid #000; margin-bottom:15px;" border="1">
            <tr style="background:#ecf0f1; -webkit-print-color-adjust:exact;">
                <td style="padding:10px;">علاقة</td><td>الاسم</td><td>القيد</td><td>الصف</td><td>الشعبة</td>
            </tr>
            <tr>
                <td style="padding:10px;">الرئيسي</td><td>${s.name}</td><td>${s.regId || '-'}</td><td>${c ? c.name : ''}</td><td>${sc ? sc.name : ''}</td>
            </tr>
            ${siblingsHtml}
        </table>
        <table style="width:100%; border-collapse:collapse; text-align:center; font-weight:bold; border:2px solid #000; margin-bottom:15px;" border="1">
            <tr style="background:#ecf0f1; -webkit-print-color-adjust:exact;">
                <td style="padding:10px;">المبلغ الكلي</td><td>الواصل (المسدد)</td><td colspan="2">المتبقي (الذمة)</td>
            </tr>
            <tr>
                <td style="padding:10px; font-size:18px;">${s.tuition.toLocaleString()}</td><td style="font-size:18px;">${p.toLocaleString()}</td><td colspan="2" style="font-size:18px; color:red;">${(s.tuition - p).toLocaleString()}</td>
            </tr>
        </table>
        <table style="width:100%; border-collapse:collapse; text-align:center; font-weight:bold; border:1px solid #000;" border="1">
            <tr style="background:#ecf0f1; -webkit-print-color-adjust:exact;"><td colspan="2">الدفعة 1</td><td colspan="2">الدفعة 2</td><td colspan="2">الدفعة 3</td><td colspan="2">الدفعة 4</td></tr>
            <tr><td>المبلغ</td><td>التاريخ</td><td>المبلغ</td><td>التاريخ</td><td>المبلغ</td><td>التاريخ</td><td>المبلغ</td><td>التاريخ</td></tr>
            <tr>
                <td>${s.payments[0]?.amount?.toLocaleString() || 0}</td><td>${s.payments[0]?.date || '-'}</td>
                <td>${s.payments[1]?.amount?.toLocaleString() || 0}</td><td>${s.payments[1]?.date || '-'}</td>
                <td>${s.payments[2]?.amount?.toLocaleString() || 0}</td><td>${s.payments[2]?.date || '-'}</td>
                <td>${s.payments[3]?.amount?.toLocaleString() || 0}</td><td>${s.payments[3]?.date || '-'}</td>
            </tr>
            <tr style="background:#ecf0f1; -webkit-print-color-adjust:exact;"><td colspan="2">الدفعة 5</td><td colspan="2">الدفعة 6</td><td colspan="2">الدفعة 7</td><td colspan="2">الدفعة 8</td></tr>
            <tr>
                <td>${s.payments[4]?.amount?.toLocaleString() || 0}</td><td>${s.payments[4]?.date || '-'}</td>
                <td>${s.payments[5]?.amount?.toLocaleString() || 0}</td><td>${s.payments[5]?.date || '-'}</td>
                <td>${s.payments[6]?.amount?.toLocaleString() || 0}</td><td>${s.payments[6]?.date || '-'}</td>
                <td>${s.payments[7]?.amount?.toLocaleString() || 0}</td><td>${s.payments[7]?.date || '-'}</td>
            </tr>
        </table>
        <div style="font-size:13px; text-align:center; margin-top:15px; border-top:1px dashed #000; padding-top:10px;">ولي الأمر ملزم بدفع المبلغ كاملاً دون قطع أي مبلغ في حال النقل أو الترك</div>
    </div>`;
    document.getElementById('print-area').innerHTML = html;
    window.print();
}

function exportStudentExcel() { 
    try {
        let s=db.students.find(x=>x.id===currentStudentId), c=db.classes.find(x=>x.id==s.classId), sc=c?c.sections.find(x=>x.id==s.sectionId):null, p=s.payments.reduce((a,b)=>a+b.amount,0); let data=[["العلاقة","الاسم","القيد","الموبايل","الصف","الشعبة","الكلي","الواصل","المتبقي"],["الرئيسي",s.name,s.regId||'',s.phone||'',c?c.name:'',sc?sc.name:'',s.tuition,p,s.tuition-p]]; if(s.siblings){s.siblings.forEach(sib=>{let xC=db.classes.find(y=>y.id==sib.classId), xS=xC?xC.sections.find(y=>y.id==sib.sectionId):null; data.push(["أخ/أخت",sib.name,sib.regId||'',"-",xC?xC.name:'',xS?xS.name:'',"","-","-"]);});} data.push([],["الدفعات","التاريخ","المبلغ"]); s.payments.forEach((py,i)=>data.push([`دفعة ${i+1}`,py.date,py.amount])); 
        let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"الحساب"); XLSX.writeFile(wb,`الطالب_${s.name}.xlsx`); 
    } catch(e) { customAlert("تأكد من توفر الاتصال بالإنترنت لتحميل ملف الإكسل", "error"); }
}
