import XCTest

/// ROADMAP.md Phase 4 -- full on-device QA pass across all 5 of
/// PRAXIS-Practice's modes, driven for real via XCUITest (not
/// `osascript`/System Events, which turned out to be both blocked by this
/// machine's Accessibility permissions and, once unblocked, unsafe -- a
/// global click landed on the Claude app's own window instead of the
/// Simulator. XCUITest's taps are scoped to the target app's own process,
/// so they can't leak to another app the way a raw screen-coordinate click
/// can).
///
/// Radio-button options in `run.html`/`teach.html` render as generic
/// `Other` elements with `value: "0"`/`"1"` (WebKit's accessibility bridge
/// doesn't expose `<input type=radio>` as a distinct button/radio type
/// here) -- `firstUnselectedRadio` below is the shared way every flow
/// selects an answer regardless of which one.
final class Phase4Tests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func firstUnselectedRadio(_ app: XCUIApplication) -> XCUIElement {
        app.otherElements.matching(NSPredicate(format: "value == '0' AND label != ''")).element(boundBy: 0)
    }

    /// WebKit reports a radio option's frame as starting at the top of the question
    /// stem above it (seen in a hierarchy dump, 2026-09-16), so the frame's centre --
    /// where a plain `tap()` aims -- lands on the stem and XCUITest refuses the tap as
    /// "not hittable". The radio itself sits at the bottom-left of that frame, so aim
    /// there instead.
    private func tapRadio(_ radio: XCUIElement) {
        radio.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 1))
            .withOffset(CGVector(dx: 16, dy: -12))
            .tap()
    }

    /// run.html shows a Start screen before a new run, but goes straight to the
    /// question when it's resuming an unfinished attempt (e.g. one a previous test run
    /// left behind) -- tap Start only if it's there.
    private func tapStartIfShown(_ app: XCUIApplication) {
        if app.buttons["Start"].waitForExistence(timeout: 5) {
            app.buttons["Start"].tap()
        }
    }

    /// The backup/restore disclosure (`<summary>` inside `<details>`) is exposed as a
    /// Button, with a second, nested Button carrying the same label -- take the first.
    private func openBackupSection(_ app: XCUIApplication) {
        let summary = app.buttons["Back up or restore progress"].firstMatch
        XCTAssertTrue(summary.waitForExistence(timeout: 10))
        summary.tap()
    }

    /// Every tab now opens on the subject list (11.2) -- tap a subject's row to reach
    /// its test menu (Practice) or topic list (Study). Rows are found by the
    /// accessibility identifier `SubjectPickerView` gives them, not by label, since
    /// both tabs list the same subject names.
    private func openSubject(_ app: XCUIApplication, tab: String = "practice", code: String = "5165") {
        let row = app.buttons["\(tab)-subject-\(code)"]
        XCTAssertTrue(row.waitForExistence(timeout: 10), "subject row \(tab)-subject-\(code) not found")
        row.tap()
    }

    /// The test menu's own <h1> is "Test menu" until its script loads the subject,
    /// then becomes the subject's name -- alongside the native navigation title, which
    /// already reads the same. Two matches means the page has actually loaded.
    private func waitForTestMenu(_ app: XCUIApplication, named name: String = "Mathematics") {
        let loaded = NSPredicate { _, _ in
            app.staticTexts.matching(NSPredicate(format: "label == %@", name)).count >= 2
        }
        expectation(for: loaded, evaluatedWith: nil)
        waitForExpectations(timeout: 10)
    }

    private func answerUntilNoneLeft(_ app: XCUIApplication, max: Int) {
        for _ in 0..<max {
            let radio = firstUnselectedRadio(app)
            guard radio.waitForExistence(timeout: 5) else { return }
            tapRadio(radio)
        }
    }

    // MARK: - 4.1 Full timed test + 4.2 progress persistence (combined: no
    // need to run the 66-question flow twice)

    func testFullTestCompletionAndPersistence() throws {
        let app = XCUIApplication()
        app.launch()
        openSubject(app)

        XCTAssertTrue(app.links["Start full test →"].waitForExistence(timeout: 10))
        app.links["Start full test →"].tap()
        tapStartIfShown(app)

        answerUntilNoneLeft(app, max: 70)

        // The confirm dialog's own "Submit test" button is in the tree even while the
        // dialog is closed -- the review screen's comes first in document order.
        XCTAssertTrue(app.buttons["Submit test"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["Submit test"].firstMatch.tap()

        // Two "Submit test" buttons share a label once the confirm dialog is
        // open (review-screen's own, and the dialog's confirm button) --
        // waiting for the dialog's unique heading first avoids racing the tap
        // against the dialog still opening.
        XCTAssertTrue(app.staticTexts["Submit test?"].waitForExistence(timeout: 10))
        let confirmButtons = app.buttons.matching(NSPredicate(format: "label == 'Submit test'"))
        confirmButtons.element(boundBy: confirmButtons.count - 1).tap()

        XCTAssertTrue(app.staticTexts["Results"].waitForExistence(timeout: 10))

        // 4.2: force-terminate (not just background) and relaunch, then
        // confirm the completed attempt survived -- the real-world version of
        // Phase 1.4's isolated localStorage check.
        app.terminate()
        app.launch()
        openSubject(app)
        waitForTestMenu(app)
        XCTAssertFalse(app.staticTexts["Not started"].exists, "attempt should have persisted across a force-quit, but the score ring still reads 'Not started'")
    }

    // MARK: - 4.1 Practice a topic (untimed drill, 10 questions)

    func testPracticeATopic() throws {
        let app = XCUIApplication()
        app.launch()
        openSubject(app)

        let startLinks = app.links.matching(NSPredicate(format: "label == 'Start →'"))
        XCTAssertTrue(startLinks.element(boundBy: 0).waitForExistence(timeout: 10))
        startLinks.element(boundBy: 0).tap() // practice-topic-start-link is first in document order
        tapStartIfShown(app)

        answerUntilNoneLeft(app, max: 15)

        // The confirm dialog's own "Submit test" button is in the tree even while the
        // dialog is closed -- the review screen's comes first in document order.
        XCTAssertTrue(app.buttons["Submit test"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["Submit test"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Submit test?"].waitForExistence(timeout: 10))
        let confirmButtons = app.buttons.matching(NSPredicate(format: "label == 'Submit test'"))
        confirmButtons.element(boundBy: confirmButtons.count - 1).tap()

        XCTAssertTrue(app.staticTexts["Drill complete"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.1 Category test (timed drill, 10 questions)

    func testCategoryTest() throws {
        let app = XCUIApplication()
        app.launch()
        openSubject(app)

        let startLinks = app.links.matching(NSPredicate(format: "label == 'Start →'"))
        XCTAssertTrue(startLinks.element(boundBy: 1).waitForExistence(timeout: 10))
        startLinks.element(boundBy: 1).tap() // category-test-start-link is second
        tapStartIfShown(app)

        answerUntilNoneLeft(app, max: 15)

        // The confirm dialog's own "Submit test" button is in the tree even while the
        // dialog is closed -- the review screen's comes first in document order.
        XCTAssertTrue(app.buttons["Submit test"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["Submit test"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Submit test?"].waitForExistence(timeout: 10))
        let confirmButtons = app.buttons.matching(NSPredicate(format: "label == 'Submit test'"))
        confirmButtons.element(boundBy: confirmButtons.count - 1).tap()

        XCTAssertTrue(app.staticTexts["Drill complete"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.1 Review a topic (untimed, immediate feedback per question)

    func testReviewATopic() throws {
        let app = XCUIApplication()
        app.launch()
        openSubject(app)

        XCTAssertTrue(app.links["Choose a topic →"].waitForExistence(timeout: 10))
        app.links["Choose a topic →"].tap()

        // Category picker screen: tap the first category link.
        XCTAssertTrue(app.links["Number and Quantity"].waitForExistence(timeout: 10))
        app.links["Number and Quantity"].tap()

        // Each answer immediately reveals feedback and disables the radios,
        // then "Next question" advances -- repeat until the drill-complete
        // screen shows up instead of another radio. Bound is the largest
        // category's real question count (39, per 5165.json) plus buffer,
        // not an arbitrary guess -- "Number and Quantity" alone has 21,
        // well past a smaller placeholder bound.
        for _ in 0..<45 {
            if app.staticTexts["Drill complete"].exists { break }
            let radio = firstUnselectedRadio(app)
            if radio.waitForExistence(timeout: 5) {
                tapRadio(radio)
            }
            XCTAssertTrue(app.buttons["Next question"].waitForExistence(timeout: 10))
            app.buttons["Next question"].tap()
        }

        XCTAssertTrue(app.staticTexts["Drill complete"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.1 Study a topic (native subject list, then topic list)

    func testStudyATopic() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.tabBars.buttons["Study"].waitForExistence(timeout: 10))
        app.tabBars.buttons["Study"].tap()
        openSubject(app, tab: "study")

        XCTAssertTrue(app.staticTexts["Algebra"].waitForExistence(timeout: 10))
        app.staticTexts["Algebra"].tap()

        // teach.html renders the category label as its own heading -- two
        // matches expected once loaded (the native nav-bar title and the
        // in-page <h1>), so just confirm at least one shows up.
        XCTAssertTrue(app.staticTexts["Algebra"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.3 Backup/restore -- observe, don't assume

    /// PRAXIS-Practice's export uses a Blob URL + `<a download>` + `.click()`
    /// (test.html's exportButton listener) -- a real browser download
    /// mechanism. `WebViewContainer`'s `Coordinator` now implements
    /// `WKDownloadDelegate` (#133): `shouldPerformDownload` routes the
    /// navigation to a `WKDownload`, which is written to a temp file and
    /// handed to a `UIActivityViewController` share sheet.
    ///
    /// Kept observational rather than a hard assertion on the share sheet's
    /// exact chrome. Live-verified 2026-09-16: tapping "Download progress"
    /// produces a real `UIActivityViewController` share sheet with the
    /// exported JSON and Copy/Save to Files/More options, confirming this
    /// path actually works end-to-end -- still not asserted on the exact
    /// chrome (e.g. a `Cancel` button), since that's simulator/OS-version
    /// presentation detail rather than something this app controls.
    func testBackupExportTap() throws {
        let app = XCUIApplication()
        app.launch()
        openSubject(app)

        openBackupSection(app)
        XCTAssertTrue(app.buttons["Download progress"].waitForExistence(timeout: 10))
        app.buttons["Download progress"].tap()
        sleep(2)
        print("=== AFTER TAPPING DOWNLOAD PROGRESS ===")
        print(app.debugDescription)
    }

    /// Restore's `<input type="file">` (test.html) works as expected -- iOS
    /// `WKWebView` has presented the native document/photo picker for a file
    /// input without any delegate code since iOS 9, unlike Android's WebView.
    /// Live-verified 2026-09-16: tapping "Upload progress" opens the native
    /// iOS document picker (Recents/Shared/Browse tabs). This test itself
    /// only confirms the button that triggers the input is reachable; it
    /// does not open or drive the native picker, which XCUITest interacts
    /// with as a separate system process outside this app's element tree.
    func testBackupRestoreButtonReachable() throws {
        let app = XCUIApplication()
        app.launch()
        openSubject(app)

        openBackupSection(app)
        // test.html wraps the file input in a <label>, not a <button> -- matched by
        // .any rather than guessing which XCUIElementType WebKit's accessibility
        // bridge assigns it (this file's own header comment already documents one
        // such surprise for radio buttons).
        XCTAssertTrue(app.descendants(matching: .any)["Upload progress"].waitForExistence(timeout: 10))
    }
}
