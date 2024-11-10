import { onMounted, ref, reactive, toRaw } from 'vue';
import { Modal } from 'bootstrap';
import axios from 'axios';
import { SERVER_URL } from '@/assets/resources/configs/config.js';
import { useHouseListStore } from '@/stores/houseListStore.js';

export default {
    setup() {
    // Store 초기화
    const houseListStore = useHouseListStore();
    
    // Refs와 reactive state 설정
    const sido = ref("");
    const gugun = ref("");
    const dong = ref("");
    
    const sidoName = ref("");
    const gugunName = ref("");
    const dongName = ref("");
    
    const keyword = ref("");
    const isLoading = ref(false);
    
    const houseInfoList = ref([]);
    const markers = reactive([]);
    let polygon = ref(null);
 
    // Mounted 시점에 지도 및 초기 설정 로드
    onMounted(() => {
        sendRequest("sido", "*00000000");
        document.addEventListener('sido-selected', e => handleSidoSelection(e.detail, e.target.innerText));
        document.addEventListener('gugun-selected', e => handleGugunSelection(e.detail, e.target.innerText));
        document.addEventListener('dong-selected', e => handleDongSelection(e.detail, e.target.innerText));
    });

    function openSidoModal(){
        const modalElement = document.getElementById('sido-modal');
        const modalInstance = new Modal(modalElement, {
            backdrop: false,
        });
        modalInstance.show();
    };
    // 시도 모달
    function closeSidoModal(){
        const modalElement = document.getElementById('sido-modal');
        const modalInstance = Modal.getInstance(modalElement);
        if(modalInstance){
            modalInstance.hide();
        }
    };

    // 구군 모달
    function openGugunModal(){
        const modalElement = document.getElementById('gugun-modal');
        const modalInstance = new Modal(modalElement, {
            backdrop: false,
        });
        if(modalInstance){
            modalInstance.show();
        }
    };
    function closeGugunModal(){
        const modalElement = document.getElementById('gugun-modal');
        const modalInstance = Modal.getInstance(modalElement);
        if(modalInstance){
            modalInstance.hide();
        }
    };

    // 동 모달
    function openDongModal(){
        const modalElement = document.getElementById('dong-modal');
        const modalInstance = new Modal(modalElement, {
            backdrop: false,
        });
        if(modalInstance){
            modalInstance.show();
        }
    };
    function closeDongModal(){
        const modalElement = document.getElementById('dong-modal');
        const modalInstance = Modal.getInstance(modalElement);
        if(modalInstance){
            modalInstance.hide();
        }
    };
    
    // 시도 선택 이벤트 핸들러
    function handleSidoSelection(sidoCode, sidoName) {
        // 1. 시도 모달 닫기
        closeSidoModal();

        // 2. 선택된 시도 표시, 다음 버튼 초기화
        document.querySelector('.sido').innerText = sidoName;
        document.querySelector('.sido').classList.add('active');
        sido.value = sidoCode;
        // 3. 구군 데이터 요청
        getGugun(sidoCode);

        // 4. 구군 모달 열기
        openGugunModal();

    };

    // 구군 선택 이벤트 핸들러
    function handleGugunSelection(gugunCode, gugunName){
        // 1. 구군 모달 닫기
        closeGugunModal();    

        // 2. 선택된 구군 표시, 다음 버튼 초기화
        document.querySelector('.gugun').innerText = gugunName;
        document.querySelector('.gugun').classList.add('active');
        gugun.value = gugunCode;
        initOption("dong");

        // 3. 동 데이터 요청
        getDong(gugunCode);

        // 4. 동 모달 열기
        openDongModal();
    };
    
    // 동 선택 이벤트 핸들러
    function handleDongSelection(dongCode, dongName){
        closeDongModal();
        document.querySelector('.dong').innerText = dongName;
        document.querySelector('.dong').classList.add('active');
        dong.value = dongCode;
    };
    // 구군 및 동 데이터 요청
    function getGugun(value){
        if(value){
            let regcode = value.substr(0, 2) + "*00000";
            sendRequest("gugun", regcode);
        }else{
            initOption("gugun");
            initOption("dong");
        }
    };

    function getDong(value){
        if(value){
            let regcode = value.substr(0, 5) + "*";
            sendRequest("dong", regcode);
        }else{
            initOption("dong");
        }
    };
    
    function sendRequest(selid, regcode) {
        const url = "https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes";
        let params = "regcode_pattern=" + regcode + "&is_ignore_zero=true";
        fetch(`${url}?${params}`)
        .then((response) => response.json())
        .then((data) => addOption(selid, data));
    };
    
    function addOption(selid, data) {
        let opt = ``;
        initOption(selid);
        switch (selid) {
            case "sido":
                // opt += `<option value="">시/도선택</option>`;
                opt += `<button type="button" value="" class="sido-btn">시/도선택</button>`;
                data.regcodes.forEach(function (regcode) {
                    opt += `<button type="button" value="${regcode.code}" class="sido-btn" onclick="this.dispatchEvent(new CustomEvent('sido-selected', {detail: '${regcode.code}', bubbles: true}))">${regcode.name}</button>`
                });
                break;
            case "gugun": {
                opt += `<button type="button" value="" class="gugun-btn">구/군선택</button>`;
                for (let i = 0; i < data.regcodes.length; i++) {
                    if (i != data.regcodes.length - 1) {
                        if (
                            data.regcodes[i].name.split(" ")[1] == data.regcodes[i + 1].name.split(" ")[1] &&
                            data.regcodes[i].name.split(" ").length != data.regcodes[i + 1].name.split(" ").length
                        ) {
                            data.regcodes.splice(i, 1);
                            i--;
                        }
                    }
                }
                let name = "";
                data.regcodes.forEach(function (regcode) {
                    if (regcode.name.split(" ").length == 2) name = regcode.name.split(" ")[1];
                    else name = regcode.name.split(" ")[1] + " " + regcode.name.split(" ")[2];
                    opt += `<button type="button" value="${regcode.code}" class="gugun-btn" onclick="this.dispatchEvent(new CustomEvent('gugun-selected', {detail: '${regcode.code}', bubbles: true}))">${name}</button>`;
                });
                break;
            }
            case "dong": {
                opt += `<button type="button" value="" class="dong-btn">동선택</button>`;
                let idx = 2;
                data.regcodes.forEach(function (regcode) {
                    if (regcode.name.split(" ").length != 3) idx = 3;
                    opt += `<button type="button" value="${regcode.code}" class="dong-btn" onclick="this.dispatchEvent(new CustomEvent('dong-selected', {detail: '${regcode.code}', bubbles: true}))">${regcode.name.split(" ")[idx]}</button>`;
                });
                break;
            }
        }
        document.querySelector(`#${selid}`).innerHTML = opt;
    };

    function initOption(selid) {
        let options = document.querySelector(`#${selid}`);
        let opt = '';

        switch(selid){
            case "gugun": {
                opt += `<button type="button" value="">구/군선택</button>`;
                options.innerHTML = opt;
                break;
            }
            case "dong": {
                opt += `<button type="button" value="">동선택</button>`;
                options.innerHTML = opt;
                break;
            }
        }
    };

    function validateForm(){
        if(sido.value != "" && gugun.value != "" && dong.value != ""){
            searchHouse(dong.value);
        }else{
            alert("지역 정보를 선택해주세요.");
            return;
        }
    };

    async function searchHouse(dongCode){
        let inputKeyword = document.querySelector('.search-input').value;
        keyword.value = inputKeyword;
        if(keyword.value != ""){
            document.querySelector('.search-subtitle').style.display = "block";
        }else{
            document.querySelector('.search-subtitle').style.display = "none";
        }

        sidoName.value = document.querySelector('.sido').innerText;
        gugunName.value = document.querySelector('.gugun').innerText;
        dongName.value = document.querySelector('.dong').innerText;


        houseListStore.setSidoName(sidoName.value);
        houseListStore.setGugunName(gugunName.value);
        houseListStore.setDongName(dongName.value);

        await houseListStore.setHouseList(dongCode, keyword.value);
        houseInfoList.value =  await houseListStore.getHouseList;
    }


    return {
        // datas
        sido,
        gugun,
        dong,
        sidoName,
        gugunName,
        dongName,
        keyword,
        isLoading,
        houseInfoList,
        markers,
        polygon,
        
        // methods
        openSidoModal,
        closeSidoModal,
        openGugunModal,
        closeGugunModal,
        openDongModal,
        closeDongModal,
        validateForm,
    }
}
}