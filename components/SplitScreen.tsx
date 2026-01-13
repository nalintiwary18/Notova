'use client'

import 'react-split-pane/styles.css';
import {SplitPane, Pane} from "react-split-pane";




export default function Home() {
    return (
        <SplitPane direction="horizontal">
        <Pane minSize="30%" defaultSize="40%">
    <div className="h-[100vh] overflow-auto bg-gray-800">
    <h1>hello</h1>
    </div>
    </Pane>
    <Pane>
    <div className="h-[100vh] overflow-auto bg-gray-900">
        <h1>hellp</h1>
        </div>
        </Pane>
        </SplitPane>
);
}
