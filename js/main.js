"use strict";
reset(1);
state = 'choosing';
cameraIntro=null;
ui.restart.disabled = true;
const coursePicker = document.getElementById('coursePicker');
function chooseCourse(mode) {
    courseMode = mode;
    restartInput(1);
    coursePicker.hidden = true;
}
document.getElementById('classicCourse').onclick = () => chooseCourse('classic');
document.getElementById('challengeCourse').onclick = () => chooseCourse('challenge');
document.getElementById('verificationCourse').onclick = () => chooseCourse('verification');
document.getElementById('chooseCourse').onclick = () => {
    release(true); endPan();
    state = 'choosing';
cameraIntro=null;
    ui.overlay.hidden = true;
    ui.restart.disabled = true;
    coursePicker.hidden = false;
    document.getElementById('classicCourse').focus();
};
requestAnimationFrame(draw);
