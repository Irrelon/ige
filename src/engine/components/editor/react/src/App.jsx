import React from 'react';
import './App.css';
function App() {
    return (<div>
      <div id="topBar" className="editorElem toggleHide">
        <div className="dropMenuContainer"></div>
      </div>
      <div id="leftBar" className="editorElem toggleHide backed"></div>
      <div id="rightBar" className="editorElem toggleHide tabGroup backed">
        <div id="tabs">
          <div className="tab1"></div>
          <div className="tab2"></div>
          <div className="tab3"></div>
          <div className="tab4"></div>
          <div className="tab5"></div>
          <div className="tab6"></div>
          <div className="tab7"></div>
          <div className="tab8"></div>
          <div className="tab9"></div>
        </div>
        <div id="tabContents" className="tabContents"></div>
      </div>
      <div id="editorControl" className="editorElem">
        <div id="editorToggle" className="header toggle">Editor Off</div>
        <div id="statsToggle" className="header toggle">Stats Off</div>
        <div id="editorTd" className="counter" title="Total Delta (How Long the Last Frame Took to Process)">...</div>
        <div id="editorRd" className="counter" title="Render Delta (How Long the Last Render Took)">...</div>
        <div id="editorUd" className="counter" title="Update Delta (How Long the Last Update Took)">...</div>
        <div id="editorDpf" className="counter" title="Draws Per Frame">...</div>
        <div id="editorDps" className="counter" title="Draws Per Second">...</div>
        <div id="editorFps" className="counter" title="Frames Per Second">...</div>
      </div>

    </div>);
}
export default App;
